import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';

@Injectable()
export class PipelinesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPipelineDto: CreatePipelineDto) {
    try {
      return await this.prisma.pipeline.create({
        data: createPipelineDto,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('webhookKey already exists');
      }

      throw error;
    }
  }

  async findAll() {
    return this.prisma.pipeline.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const pipeline = await this.prisma.pipeline.findUnique({
      where: { id },
    });

    if (!pipeline) {
      throw new NotFoundException(`Pipeline with ID ${id} not found`);
    }

    return pipeline;
  }

  async update(id: string, updatePipelineDto: UpdatePipelineDto) {
    await this.findOne(id);

    try {
      return await this.prisma.pipeline.update({
        where: { id },
        data: updatePipelineDto,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('webhookKey already exists');
      }

      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.pipeline.delete({
      where: { id },
    });
  }
}