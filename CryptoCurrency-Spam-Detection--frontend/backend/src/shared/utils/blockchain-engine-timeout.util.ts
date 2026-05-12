import { ConfigService } from '@nestjs/config';

const DEFAULT_MS = 15_000;

export function getBlockchainEngineTimeoutMs(configService: ConfigService): number {
  const raw = configService.get<string>('BLOCKCHAIN_ENGINE_TIMEOUT_MS');
  if (raw === undefined || raw === '') return DEFAULT_MS;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return DEFAULT_MS;
  return Math.max(1000, n);
}
