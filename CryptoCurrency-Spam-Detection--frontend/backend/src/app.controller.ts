import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('api/v1/health')
  async getHealth() {
    const checks: Record<string, { ok: boolean; detail?: string }> = {
      database: { ok: false },
      redis: { ok: false },
      blockchainEngine: { ok: false },
    };

    try {
      await this.dataSource.query('SELECT 1');
      checks.database = { ok: true };
    } catch (error) {
      checks.database = { ok: false, detail: (error as Error).message };
    }

    const redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2500,
    });
    try {
      await redis.connect();
      const pong = await redis.ping();
      checks.redis = { ok: pong === 'PONG', detail: pong };
    } catch (error) {
      checks.redis = { ok: false, detail: (error as Error).message };
    } finally {
      redis.disconnect();
    }

    const blockchainApiUrl = this.configService.get<string>('BLOCKCHAIN_API_URL', 'http://127.0.0.1:8055');
    try {
      const response = await axios.get(`${blockchainApiUrl}/health`, { timeout: 3000 });
      checks.blockchainEngine = { ok: response.data?.status === 'ok' };
    } catch (error) {
      checks.blockchainEngine = { ok: false, detail: (error as Error).message };
    }

    const allOk = Object.values(checks).every((check) => check.ok);
    return {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
