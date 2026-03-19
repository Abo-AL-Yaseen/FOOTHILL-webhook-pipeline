import { Controller, Get, Param, Query } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobStatus } from '@prisma/client';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  findAll(
    @Query('status') status?: JobStatus,
    @Query('pipelineId') pipelineId?: string,
  ) {
    return this.jobsService.findAll(status, pipelineId);
  }

  @Get(':id/delivery-attempts')
  findDeliveryAttempts(@Param('id') id: string) {
    return this.jobsService.findDeliveryAttempts(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }
}