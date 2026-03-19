import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeliveryStatus } from '@prisma/client';

@Injectable()
export class DeliveryAttemptsService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    jobId: string;
    subscriberId: string;
    attemptNumber: number;
    status: DeliveryStatus;
    responseStatusCode?: number | null;
    responseBody?: any;
    errorMessage?: string | null;
  }) {
    return this.prisma.deliveryAttempt.create({
      data: {
        jobId: data.jobId,
        subscriberId: data.subscriberId,
        attemptNumber: data.attemptNumber,
        status: data.status,
        responseStatusCode: data.responseStatusCode ?? null,
        responseBody: data.responseBody ?? null,
        errorMessage: data.errorMessage ?? null,
      },
    });
  }

  findAll(jobId?: string, subscriberId?: string, status?: DeliveryStatus) {
    return this.prisma.deliveryAttempt.findMany({
      where: {
        ...(jobId ? { jobId } : {}),
        ...(subscriberId ? { subscriberId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: {
        attemptedAt: 'desc',
      },
      include: {
        job: true,
        subscriber: true,
      },
    });
  }

  async findOne(id: string) {
    const deliveryAttempt = await this.prisma.deliveryAttempt.findUnique({
      where: { id },
      include: {
        job: true,
        subscriber: true,
      },
    });

    if (!deliveryAttempt) {
      throw new NotFoundException(`Delivery attempt with ID ${id} not found`);
    }

    return deliveryAttempt;
  }
}