import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';

@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService,private readonly jobsService: JobsService) {}

    async ingestWebhook(webhookKey: string,payload: Record<string, any>,providedSecret?: string,){
        const pipeline = await this.prisma.pipeline.findUnique({
        where: { webhookKey },
        });

        if (!pipeline || !pipeline.active) {
            throw new NotFoundException('Pipeline not found or inactive');
        }

        if (pipeline.secret && pipeline.secret !== providedSecret) {
            throw new ForbiddenException('Invalid webhook secret');
        }

        const job = await this.prisma.job.create({
        data: {
            pipelineId: pipeline.id,
            rawPayload: payload,
            status: 'PENDING',
        },
        });

        await this.jobsService.addWebhookJob({
            pipelineId: pipeline.id,
            jobId: job.id,
            payload,
        });

        return {
            message: 'Webhook accepted',
            pipelineId: pipeline.id,
            jobId: job.id,
            status: job.status,
        };
    }
}