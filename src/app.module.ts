import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { PipelinesModule } from './pipelines/pipelines.module';
import { JobsModule } from './jobs/jobs.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { SubscribersController } from './subscribers/subscribers.controller';
import { SubscribersService } from './subscribers/subscribers.service';
import { SubscribersModule } from './subscribers/subscribers.module';
import { DeliveryAttemptsModule } from './delivery-attempts/delivery-attempts.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
      },
    }),
    PrismaModule,
    PipelinesModule,
    JobsModule,
    WebhooksModule,
    SubscribersModule,
    DeliveryAttemptsModule,
    HealthModule,
  ],
  controllers: [AppController, SubscribersController],
  providers: [AppService, SubscribersService],
})
export class AppModule {}