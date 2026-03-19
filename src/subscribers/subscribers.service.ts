import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { UpdateSubscriberDto } from './dto/update-subscriber.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SubscribersService {
  constructor(private readonly prisma: PrismaService) {}

  create(createSubscriberDto: CreateSubscriberDto) {
    return this.prisma.subscriber.create({
      data: createSubscriberDto,
    });
  }

  findAll(pipelineId?: string, active?: boolean) {
    return this.prisma.subscriber.findMany({
      where: {
        ...(pipelineId ? { pipelineId } : {}),
        ...(active !== undefined ? { active } : {}),
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
    const subscriber = await this.prisma.subscriber.findUnique({
      where: { id },
      include: {
        pipeline: true,
      },
    });

    if (!subscriber) {
      throw new NotFoundException(`Subscriber with ID ${id} not found`);
    }

    return subscriber;
  }

  async update(id: string, updateSubscriberDto: UpdateSubscriberDto) {
    try {
      return await this.prisma.subscriber.update({
        where: { id },
        data: updateSubscriberDto,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Subscriber with ID ${id} not found`);
      }

      throw error;
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.subscriber.delete({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Subscriber with ID ${id} not found`);
      }

      throw error;
    }
  }
}