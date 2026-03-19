import { Controller, Get, Param, Query } from '@nestjs/common';
import { DeliveryAttemptsService } from './delivery-attempts.service';
import { DeliveryStatus } from '@prisma/client';

@Controller('delivery-attempts')
export class DeliveryAttemptsController {
  constructor(
    private readonly deliveryAttemptsService: DeliveryAttemptsService,
  ) {}

  @Get()
  findAll(
    @Query('jobId') jobId?: string,
    @Query('subscriberId') subscriberId?: string,
    @Query('status') status?: DeliveryStatus,
  ) {
    return this.deliveryAttemptsService.findAll(jobId, subscriberId, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.deliveryAttemptsService.findOne(id);
  }
}