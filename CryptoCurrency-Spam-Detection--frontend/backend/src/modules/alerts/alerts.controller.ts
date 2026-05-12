import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { EmailService } from './email.service';
import { AuditLogService } from '../misc/audit-log.service';

@ApiTags('Alerts')
@Controller('api/v1/alerts')
export class AlertsController {
  constructor(
    private readonly alertsService: AlertsService,
    private readonly emailService: EmailService,
    private readonly auditLogService: AuditLogService,
  ) { }

  @Get()
  @ApiOperation({ summary: 'Get all alerts' })
  getAlerts() {
    return this.alertsService.getAlerts();
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get alert settings + configured email provider' })
  async getSettings() {
    const settings = await this.alertsService.getSettings();
    return {
      ...settings,
      emailProvider: this.emailService.getConfiguredProvider(),
    };
  }

  @Post('settings')
  @ApiOperation({ summary: 'Save alert settings' })
  async saveSettings(@Body() body: any, @Req() req: any) {
    const saved = await this.alertsService.saveSettings(body);
    await this.auditLogService.log({
      actor: req?.user?.email ?? req?.user?.sub ?? 'system',
      action: 'alerts.settings.update',
      resource: '/api/v1/alerts/settings',
      meta: {
        telegramConfigured: Boolean(saved.telegram?.botToken && saved.telegram?.chatId),
        discordConfigured: Boolean(saved.discord?.webhookUrl),
        emailConfigured: Boolean(saved.email?.address),
      },
    });
    if (body?.test) {
      await this.alertsService.emitTestAlert(req?.user?.sub);
    }
    return { ...saved, emailProvider: this.emailService.getConfiguredProvider() };
  }

  @Post('test')
  @ApiOperation({ summary: 'Emit test alert to all configured channels' })
  async testAlert(@Req() req: any) {
    const alert = await this.alertsService.emitTestAlert(req?.user?.sub);
    await this.auditLogService.log({
      actor: req?.user?.email ?? req?.user?.sub ?? 'system',
      action: 'alerts.test.send',
      resource: '/api/v1/alerts/test',
      meta: { alertId: alert.id },
    });
    return { success: true, alertId: alert.id };
  }

  @Post('test-email')
  @ApiOperation({ summary: 'Send a test email directly to verify configuration' })
  async testEmail(@Body() body: { to: string }) {
    if (!body?.to) {
      return { success: false, error: 'Missing "to" email address' };
    }
    const result = await this.emailService.send({
      to: body.to,
      subject: 'CryptoShield — Email test',
      text: `This is a test email from CryptoShield Intelligence Platform.\n\nIf you received this, your email configuration is working correctly.\n\nProvider: ${this.emailService.getConfiguredProvider()}`,
      html: EmailService.buildAlertHtml({
        type: 'test',
        chain: 'all chains',
        address: 'test',
        message: 'This is a test email. Your email alerts are configured correctly.',
      }),
    });
    return result;
  }
}