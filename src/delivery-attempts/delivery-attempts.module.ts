import { Module } from '@nestjs/common';
import { DeliveryAttemptsController } from './delivery-attempts.controller';
import { DeliveryAttemptsService } from './delivery-attempts.service';

@Module({
  controllers: [DeliveryAttemptsController],
  providers: [DeliveryAttemptsService],
  exports: [DeliveryAttemptsService],
})
export class DeliveryAttemptsModule {}