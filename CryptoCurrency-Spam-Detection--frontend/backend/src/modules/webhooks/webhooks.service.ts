import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { WebhooksRepository } from './webhooks.repository';
import { RegisterWebhookDto } from './dto/register-webhook.dto';
import { WebhookPayload } from '../../shared/interfaces/webhook-payload.interface';
import { Webhook } from './entities/webhook.entity';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly webhooksRepository: WebhooksRepository,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterWebhookDto): Promise<Webhook> {
    return this.webhooksRepository.create({
      url: dto.url,
      events: dto.events || ['flagged_interaction', 'new_transaction'],
      isActive: true,
      failureCount: 0,
    });
  }

  async findAll(): Promise<Webhook[]> {
    return this.webhooksRepository.findAll();
  }

  async delete(id: string): Promise<void> {
    await this.webhooksRepository.delete(id);
  }

  async getActiveWebhooksForEvent(event: string): Promise<Webhook[]> {
    return this.webhooksRepository.findActiveByEvent(event);
  }

  async incrementFailure(id: string): Promise<void> {
    const webhook = await this.webhooksRepository.findById(id);
    if (webhook) {
      await this.handleWebhookFailure(webhook);
    }
  }

  async disableWebhook(id: string): Promise<void> {
    await this.webhooksRepository.update(id, { isActive: false });
  }

  async getWebhooksForEvent(event: string): Promise<Webhook[]> {
    return this.webhooksRepository.findActiveByEvent(event);
  }

  async dispatchAlert(payload: WebhookPayload): Promise<void> {
    const webhooks = await this.getActiveWebhooksForEvent(payload.event);

    const timeout = this.configService.get<number>('WEBHOOK_TIMEOUT', 5000);

    for (const webhook of webhooks) {
      try {
        await firstValueFrom(
          this.httpService.post(webhook.url, payload, {
            timeout,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      } catch (error) {
        await this.handleWebhookFailure(webhook);
      }
    }
  }

  private async handleWebhookFailure(webhook: Webhook): Promise<void> {
    const maxFailures = 5;
    const newFailureCount = webhook.failureCount + 1;

    if (newFailureCount >= maxFailures) {
      await this.webhooksRepository.update(webhook.id, {
        isActive: false,
        failureCount: newFailureCount,
      });
    } else {
      await this.webhooksRepository.update(webhook.id, {
        failureCount: newFailureCount,
      });
    }
  }
}
