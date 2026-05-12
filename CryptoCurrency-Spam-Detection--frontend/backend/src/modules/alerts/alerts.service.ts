import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { AlertSettingsEntity } from './alert-settings.entity';
import { AlertEntity } from './alert.entity';
import { AlertsGateway } from './alerts.gateway';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(AlertSettingsEntity)
    private settingsRepo: Repository<AlertSettingsEntity>,
    @InjectRepository(AlertEntity)
    private alertsRepo: Repository<AlertEntity>,
    @InjectQueue('alerts')
    private readonly alertsQueue: Queue,
    private readonly alertsGateway: AlertsGateway,
  ) {}

  async getSettings(userId?: string): Promise<AlertSettingsEntity> {
    try {
      let settings = await this.settingsRepo.findOne({
        where: { userId: userId ?? '' },
      });
      if (!settings) {
        settings = this.settingsRepo.create({ userId: userId ?? '' });
        await this.settingsRepo.save(settings);
      }
      return settings;
    } catch {
      return {
        id: 'default-alert-settings',
        userId: userId ?? '',
        telegram: {},
        discord: {},
        email: {},
        rules: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      } as AlertSettingsEntity;
    }
  }

  async saveSettings(
    payload: Record<string, unknown>,
    userId?: string,
  ): Promise<AlertSettingsEntity> {
    try {
      let settings = await this.settingsRepo.findOne({
        where: { userId: userId ?? '' },
      });
      if (!settings) {
        settings = this.settingsRepo.create({ userId: userId ?? '' });
      }

      if (payload['telegram'] !== undefined) {
        settings.telegram = payload['telegram'] as Record<string, string>;
      }
      if (payload['discord'] !== undefined) {
        settings.discord = payload['discord'] as Record<string, string>;
      }
      if (payload['email'] !== undefined) {
        settings.email = payload['email'] as Record<string, string>;
      }
      if (payload['rules'] !== undefined) {
        settings.rules = payload['rules'] as Record<string, unknown>;
      }

      return await this.settingsRepo.save(settings);
    } catch {
      return {
        id: 'default-alert-settings',
        userId: userId ?? '',
        telegram: (payload['telegram'] as Record<string, string>) ?? {},
        discord: (payload['discord'] as Record<string, string>) ?? {},
        email: (payload['email'] as Record<string, string>) ?? {},
        rules: (payload['rules'] as Record<string, unknown>) ?? {},
        createdAt: new Date(),
        updatedAt: new Date(),
      } as AlertSettingsEntity;
    }
  }

  async getAlerts(): Promise<AlertEntity[]> {
    try {
      const alerts = await this.alertsRepo.find({
        order: { createdAt: 'DESC' },
        take: 100,
      });

      return alerts.map((alert) => ({
        ...alert,
        type: alert.type || 'large_transaction',
        title:
          alert.type === 'risk_increase'
            ? 'Risk score increased'
            : alert.type === 'flagged_interaction'
              ? 'Flagged counterparty interaction'
              : 'Large transaction detected',
        message: alert.message || '',
      }));
    } catch {
      return [];
    }
  }

  async checkAndTriggerAlerts(params: {
    fromAddress: string;
    toAddress: string;
    txHash: string;
    amount: string;
    chain: string;
    timestamp: string;
  }): Promise<void> {
    const settings = await this.getSettings();
    const rules = settings.rules ?? {};
    const minAmount = rules['minimumAmount'] as number | undefined;
    const minRisk = rules['minimumRiskScore'] as number | undefined;
    const amount = parseFloat(params.amount);

    const shouldAlert =
      (minAmount !== undefined && !isNaN(amount) && amount >= minAmount) ||
      minRisk !== undefined;

    if (shouldAlert) {
      const alert = this.alertsRepo.create({
        address: params.fromAddress,
        chain: params.chain,
        type: 'threshold',
        message: `Alert triggered for tx ${params.txHash}: amount ${params.amount}`,
      });
      await this.alertsRepo.save(alert);
      this.alertsGateway.sendAlert(alert);
      await this.enqueueWebhookDelivery({
        event: 'alert.triggered',
        address: params.fromAddress,
        relatedFlagged: params.toAddress,
        txHash: params.txHash,
        amount: Number(params.amount),
        timestamp: new Date().toISOString(),
        chain: params.chain,
      });
      await this.enqueueRiskRecompute(params.fromAddress, params.chain);
      await this.enqueueChannelDelivery(alert.id);
    }
  }

  async enqueueWebhookDelivery(payload: {
    event: string;
    address: string;
    relatedFlagged: string;
    txHash: string;
    amount: number;
    timestamp: string;
    chain: string;
  }): Promise<void> {
    await this.alertsQueue.add('webhook-delivery', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
      removeOnFail: 100,
    });
  }

  async enqueueRiskRecompute(address: string, chain: string): Promise<void> {
    await this.alertsQueue.add(
      'risk-recompute',
      { address, chain },
      {
        attempts: 2,
        backoff: { type: 'fixed', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  }

  async enqueueChannelDelivery(alertId: string): Promise<void> {
    await this.alertsQueue.add(
      'channel-delivery',
      { alertId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1500 },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  }

  async emitTestAlert(userId?: string): Promise<AlertEntity> {
    const alert = this.alertsRepo.create({
      address: 'test-address',
      chain: 'ethereum',
      type: 'large_transaction',
      message: `Test alert generated at ${new Date().toISOString()}`,
      read: false,
    });
    const saved = await this.alertsRepo.save(alert);
    this.alertsGateway.sendAlert(saved);
    await this.enqueueChannelDelivery(saved.id);
    return saved;
  }
}