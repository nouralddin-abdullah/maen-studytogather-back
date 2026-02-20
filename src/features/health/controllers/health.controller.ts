import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Public } from '@core/decorators';
import { secrets } from '@core/config';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  // simple Redis ping check
  private async checkRedis(): Promise<HealthIndicatorResult> {
    if (!secrets.mail.queueEnabled) {
      return { redis: { status: 'up', enabled: false } };
    }

    try {
      const { createClient } = await import('redis');
      const client = createClient({
        socket: {
          host: secrets.redis.host,
          port: secrets.redis.port,
        },
        username: secrets.redis.username,
        password: secrets.redis.password || undefined,
      });

      await client.connect();
      await client.ping();
      await client.disconnect();

      return { redis: { status: 'up' } };
    } catch (error) {
      return {
        redis: {
          status: 'down',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  @Public()
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // database health check
      () => this.db.pingCheck('database'),

      // memory health check if -> check if there's atleast 200mb
      () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024),

      // disk - health storage should not exceed 90%
      () =>
        this.disk.checkStorage('storage', {
          path: process.platform === 'win32' ? 'C:\\' : '/',
          thresholdPercent: 0.9,
        }),

      // redis health check (only when queue enabled)
      () => this.checkRedis(),
    ]);
  }

  // liveness probe for k8s (simple might be wrong)
  @Public()
  @Get('live')
  live() {
    return { status: 'ok' };
  }

  // readiness probe - checks if app can handle traffic
  @Public()
  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }
}
