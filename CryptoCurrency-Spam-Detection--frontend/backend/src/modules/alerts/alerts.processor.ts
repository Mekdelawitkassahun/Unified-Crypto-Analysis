import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { WebhooksService } from '../webhooks/webhooks.service';
import { WebhookPayload } from '../../shared/interfaces/webhook-payload.interface';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { RiskScoringService } from '../risk-scoring/risk-scoring.service';
import { Chain } from '../../shared/enums/chain.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertEntity } from './alert.entity';
import { AlertSettingsEntity } from './alert-settings.entity';
import { EmailService } from './email.service';

@Processor('alerts')
export class AlertsProcessor {
  private readonly logger = new Logger(AlertsProcessor.name);

  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly configService: ConfigService,
    private readonly riskScoringService: RiskScoringService,
    private readonly emailService: EmailService,
    @InjectRepository(AlertEntity)
    private readonly alertsRepo: Repository<AlertEntity>,
    @InjectRepository(AlertSettingsEntity)
    private readonly settingsRepo: Repository<AlertSettingsEntity>,
  ) { }

  @Process('webhook-delivery')
  async handleWebhookDelivery(job: Job<WebhookPayload>) {
    const payload = job.data;
    const webhooks = await this.webhooksService.getWebhooksForEvent(payload.event);
    const timeout = this.configService.get<number>('WEBHOOK_TIMEOUT', 5000);

    await Promise.all(
      webhooks.map(async (webhook) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);
          const response = await fetch(webhook.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Secret': this.configService.get('WEBHOOK_SECRET', ''),
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (!response.ok) throw new Error(`Webhook returned ${response.status}`);
        } catch (error) {
          await this.webhooksService.incrementFailure(webhook.id);
          const all = await this.webhooksService.findAll();
          const w = all.find((x) => x.id === webhook.id);
          if (w && w.failureCount >= 5) await this.webhooksService.disableWebhook(webhook.id);
          throw error;
        }
      }),
    );
  }

  @Process('risk-recompute')
  async handleRiskRecompute(job: Job<{ address: string; chain: string }>) {
    const chain = (job.data.chain ?? 'ethereum') as Chain;
    await this.riskScoringService.calculateRisk(job.data.address, chain);
    this.logger.log(`Risk recomputed for ${job.data.address} on ${chain}`);
  }

  @Process('channel-delivery')
  async handleChannelDelivery(job: Job<{ alertId: string }>) {
    const alert = await this.alertsRepo.findOne({ where: { id: job.data.alertId } });
    if (!alert) return;

    const settings = await this.settingsRepo.findOne({ order: { updatedAt: 'DESC' } });
    if (!settings) return;

    const plainText = `[${alert.chain}] ${alert.type}: ${alert.message ?? ''} (${alert.address})`;

    // ── Telegram ──────────────────────────────────────────────────────────────
    const botToken = settings.telegram?.botToken;
    const chatId = settings.telegram?.chatId;
    if (botToken && chatId) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: plainText }),
      }).catch((err: unknown) => {
        this.logger.warn(`Telegram delivery failed: ${(err as Error).message}`);
      });
    }

    // ── Discord ───────────────────────────────────────────────────────────────
    const discordWebhook = settings.discord?.webhookUrl;
    if (discordWebhook) {
      await fetch(discordWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: plainText, username: 'CryptoShield Alerts' }),
      }).catch((err: unknown) => {
        this.logger.warn(`Discord delivery failed: ${(err as Error).message}`);
      });
    }

    // ── Email ─────────────────────────────────────────────────────────────────
    const toEmail = settings.email?.address;
    if (toEmail) {
      const html = EmailService.buildAlertHtml({
        type: alert.type,
        chain: alert.chain,
        address: alert.address,
        message: alert.message ?? '',
      });

      const result = await this.emailService.send({
        to: toEmail,
        subject: `CryptoShield Alert: ${alert.type.replace(/_/g, ' ')} on ${alert.chain}`,
        text: plainText,
        html,
      });

      if (!result.success) {
        this.logger.warn(`Email delivery failed (${result.provider}): ${result.error}`);
      } else {
        this.logger.log(`Email delivered via ${result.provider} to ${toEmail}`);
      }
    }
  }
}
