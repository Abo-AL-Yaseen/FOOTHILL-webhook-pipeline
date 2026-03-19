import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  getHealth() {
    return {
      status: 'ok',
      service: 'webhook-pipeline',
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness() {
    const db = await this.checkDatabase();
    const redis = await this.checkRedis();

    const isReady = db.status === 'ok' && redis.status === 'ok';

    const response = {
      status: isReady ? 'ready' : 'not_ready',
      service: 'webhook-pipeline',
      timestamp: new Date().toISOString(),
      checks: {
        database: db,
        redis,
      },
    };

    if (!isReady) {
      throw new InternalServerErrorException(response);
    }

    return response;
  }

  private async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        message: 'Database connection is healthy',
      };
    } catch {
      return {
        status: 'error',
        message: 'Database connection failed',
      };
    }
  }

  private async checkRedis() {
    let redis: Redis | null = null;

    try {
      redis = new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });

      await redis.connect();
      const pong = await redis.ping();

      return {
        status: pong === 'PONG' ? 'ok' : 'error',
        message:
          pong === 'PONG'
            ? 'Redis connection is healthy'
            : 'Redis ping failed',
      };
    } catch {
      return {
        status: 'error',
        message: 'Redis connection failed',
      };
    } finally {
      if (redis) {
        await redis.quit().catch(() => {});
      }
    }
  }
}