import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { SubscribersService } from '../subscribers/subscribers.service';
import { DeliveryAttemptsService } from '../delivery-attempts/delivery-attempts.service';
import { ActionType, DeliveryStatus, JobStatus } from '@prisma/client';

@Processor('webhook-processing')
export class JobsProcessor extends WorkerHost {
  private static readonly MAX_DELIVERY_ATTEMPTS = 3;
  private static readonly RETRY_DELAY_MS = 2000;
  private static readonly DELIVERY_TIMEOUT_MS = 5000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscribersService: SubscribersService,
    private readonly deliveryAttemptsService: DeliveryAttemptsService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>) {
    const { jobId } = job.data;

    const dbJob = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        pipeline: true,
      },
    });

    if (!dbJob) {
      throw new Error(`Job ${jobId} not found in database`);
    }

    await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.PROCESSING,
        errorMessage: null,
      },
    });

    try {
      const processedPayload = this.applyAction(
        dbJob.pipeline.actionType,
        dbJob.rawPayload as Record<string, any>,
        (dbJob.pipeline.actionConfig as Record<string, any>) || {},
      );

      const subscribers = await this.prisma.subscriber.findMany({
        where: {
          pipelineId: dbJob.pipelineId,
          active: true,
        },
      });

      let hasFailedDelivery = false;

      for (const subscriber of subscribers) {
        const delivered = await this.deliverWithRetry(
          dbJob.id,
          subscriber.id,
          subscriber.targetUrl,
          processedPayload,
        );

        if (!delivered) {
          hasFailedDelivery = true;
        }
      }

      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          processedPayload,
          status: hasFailedDelivery ? JobStatus.FAILED : JobStatus.COMPLETED,
          processedAt: new Date(),
          errorMessage: hasFailedDelivery
            ? 'One or more deliveries failed after retries'
            : null,
        },
      });

      return {
        success: !hasFailedDelivery,
        jobId,
      };
    } catch (error) {
      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: JobStatus.FAILED,
          errorMessage:
            error instanceof Error ? error.message : 'Unknown processing error',
          processedAt: new Date(),
        },
      });

      throw error;
    }
  }

  private async deliverWithRetry(
    jobId: string,
    subscriberId: string,
    targetUrl: string,
    processedPayload: Record<string, any>,
  ): Promise<boolean> {
    for (
      let attempt = 1;
      attempt <= JobsProcessor.MAX_DELIVERY_ATTEMPTS;
      attempt++
    ) {
      try {
        const response = await axios.post(targetUrl, processedPayload, {
          timeout: JobsProcessor.DELIVERY_TIMEOUT_MS,
        });

        await this.deliveryAttemptsService.create({
          jobId,
          subscriberId,
          attemptNumber: attempt,
          status: DeliveryStatus.SUCCESS,
          responseStatusCode: response.status,
          responseBody: this.serializeResponseBody(response.data),
          errorMessage: null,
        });

        return true;
      } catch (error: any) {
        await this.deliveryAttemptsService.create({
          jobId,
          subscriberId,
          attemptNumber: attempt,
          status: DeliveryStatus.FAILED,
          responseStatusCode: error?.response?.status ?? null,
          responseBody: this.serializeResponseBody(error?.response?.data),
          errorMessage:
          error?.message && error.message.trim() !== ''
            ? error.message
            : 'Delivery failed',
        });

        const isLastAttempt =
          attempt === JobsProcessor.MAX_DELIVERY_ATTEMPTS;

        if (!isLastAttempt) {
          await this.sleep(JobsProcessor.RETRY_DELAY_MS);
        }
      }
    }

    return false;
  }

  private serializeResponseBody(data: unknown): string | null {
    if (data === null || data === undefined) {
      return null;
    }

    if (typeof data === 'string') {
      return data;
    }

    try {
      return JSON.stringify(data);
    } catch {
      return String(data);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private applyAction(
    actionType: ActionType,
    payload: Record<string, any>,
    actionConfig: Record<string, any>,
  ) {
    switch (actionType) {
      case ActionType.ADD_TIMESTAMP:
        return {
          ...payload,
          timestamp: new Date().toISOString(),
        };

      case ActionType.UPPERCASE_TEXT: {
        const field = actionConfig.field;
        if (!field || typeof payload[field] !== 'string') {
          throw new Error('UPPERCASE_TEXT requires a valid string field');
        }

        return {
          ...payload,
          [field]: payload[field].toUpperCase(),
        };
      }

      case ActionType.EXTRACT_FIELD: {
        const field = actionConfig.field;
        if (!field) {
          throw new Error('EXTRACT_FIELD requires field in actionConfig');
        }

        return {
          extractedField: payload[field] ?? null,
        };
      }

      default:
        throw new Error(`Unsupported action type: ${actionType}`);
    }
  }
}