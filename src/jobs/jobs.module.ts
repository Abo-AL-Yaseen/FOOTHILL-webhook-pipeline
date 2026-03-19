import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JobsService } from './jobs.service';
import { JobsProcessor } from './jobs.processor';
import { JobsController } from './jobs.controller';
import { SubscribersModule } from '../subscribers/subscribers.module';
import { DeliveryAttemptsModule } from '../delivery-attempts/delivery-attempts.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'webhook-processing',
    }),
    SubscribersModule,
    DeliveryAttemptsModule,
  ],
  controllers: [JobsController],
  providers: [JobsService, JobsProcessor],
  exports: [JobsService],
})
export class JobsModule {}