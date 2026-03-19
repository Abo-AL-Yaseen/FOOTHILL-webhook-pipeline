import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { JobStatus } from '@prisma/client';

@Injectable()
export class JobsService {
  constructor(
    @InjectQueue('webhook-processing')
    private readonly webhookProcessingQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  async addWebhookJob(data: {
    pipelineId: string;
    jobId: string;
    payload: any;
  }) {
    return this.webhookProcessingQueue.add('process-webhook', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async findAll(status?: JobStatus, pipelineId?: string) {
    return this.prisma.job.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(pipelineId ? { pipelineId } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        pipeline: true,
      },
    });
  }

  async findOne(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        pipeline: true,
      },
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    return job;
  }

  async findDeliveryAttempts(jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    return this.prisma.deliveryAttempt.findMany({
      where: { jobId },
      orderBy: {
        attemptedAt: 'desc',
      },
      include: {
        subscriber: true,
      },
    });
  }
}