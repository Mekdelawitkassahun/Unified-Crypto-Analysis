import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import axios from 'axios';

export interface EmailPayload {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

/**
 * EmailService — sends to ANY email address via one of three providers:
 *  1. Resend  (RESEND_API_KEY)                   ← active, free 3000/month
 *  2. Gmail   (GMAIL_USER + GMAIL_APP_PASSWORD)  ← fallback
 *  3. SMTP    (SMTP_HOST + SMTP_USER + SMTP_PASS) ← fallback
 */
@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);

    constructor(private readonly configService: ConfigService) { }

    async send(payload: EmailPayload): Promise<{ success: boolean; provider: string; error?: string }> {
        // 1. Resend — sends to ANY address, free tier 3000/month
        const resendKey = this.configService.get<string>('RESEND_API_KEY');
        if (resendKey) {
            return this.sendViaResend(payload, resendKey);
        }

        // 2. Gmail
        const gmailUser = this.configService.get<string>('GMAIL_USER');
        const gmailPass = this.configService.get<string>('GMAIL_APP_PASSWORD');
        if (gmailUser && gmailPass && !gmailUser.startsWith('your_')) {
            return this.sendViaGmail(payload, gmailUser, gmailPass);
        }

        // 3. Generic SMTP
        const smtpHost = this.configService.get<string>('SMTP_HOST');
        const smtpUser = this.configService.get<string>('SMTP_USER');
        const smtpPass = this.configService.get<string>('SMTP_PASS');
        if (smtpHost && smtpUser && smtpPass) {
            return this.sendViaSMTP(payload, smtpHost, smtpUser, smtpPass);
        }

        return {
            success: false,
            provider: 'none',
            error: 'No email provider configured. Add RESEND_API_KEY to .env',
        };
    }

    private async sendViaResend(
        payload: EmailPayload,
        apiKey: string,
    ): Promise<{ success: boolean; provider: string; error?: string }> {
        const from = this.configService.get<string>('EMAIL_FROM', 'CryptoShield Alerts <onboarding@resend.dev>');
        try {
            const res = await axios.post(
                'https://api.resend.com/emails',
                {
                    from,
                    to: [payload.to],
                    subject: payload.subject,
                    text: payload.text,
                    html: payload.html ?? `<pre style="font-family:sans-serif">${payload.text}</pre>`,
                },
                {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 10000,
                },
            );
            this.logger.log(`Email sent via Resend to ${payload.to} (id: ${res.data?.id})`);
            return { success: true, provider: 'resend' };
        } catch (err: any) {
            const msg = err?.response?.data?.message ?? err?.message ?? 'Unknown error';
            this.logger.warn(`Resend delivery failed: ${msg}`);
            return { success: false, provider: 'resend', error: msg };
        }
    }

    private async sendViaGmail(
        payload: EmailPayload,
        user: string,
        appPassword: string,
    ): Promise<{ success: boolean; provider: string; error?: string }> {
        const from = this.configService.get<string>('EMAIL_FROM', `CryptoShield Alerts <${user}>`);
        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user, pass: appPassword },
            });
            await transporter.verify();
            await transporter.sendMail({
                from,
                to: payload.to,
                subject: payload.subject,
                text: payload.text,
                html: payload.html,
            });
            this.logger.log(`Email sent via Gmail to ${payload.to}`);
            return { success: true, provider: 'gmail' };
        } catch (err: any) {
            const msg = (err as Error).message ?? 'Unknown error';
            this.logger.warn(`Gmail delivery failed: ${msg}`);
            return { success: false, provider: 'gmail', error: msg };
        }
    }

    private async sendViaSMTP(
        payload: EmailPayload,
        host: string,
        user: string,
        pass: string,
    ): Promise<{ success: boolean; provider: string; error?: string }> {
        const port = this.configService.get<number>('SMTP_PORT', 587);
        const from = this.configService.get<string>('EMAIL_FROM', `alerts@${host}`);
        try {
            const transporter = nodemailer.createTransport({
                host,
                port,
                secure: port === 465,
                auth: { user, pass },
                tls: { rejectUnauthorized: false },
            });
            await transporter.sendMail({ from, to: payload.to, subject: payload.subject, text: payload.text, html: payload.html });
            this.logger.log(`Email sent via SMTP (${host}) to ${payload.to}`);
            return { success: true, provider: 'smtp' };
        } catch (err: any) {
            const msg = (err as Error).message ?? 'Unknown error';
            this.logger.warn(`SMTP delivery failed: ${msg}`);
            return { success: false, provider: 'smtp', error: msg };
        }
    }

    getConfiguredProvider(): 'resend' | 'gmail' | 'smtp' | 'none' {
        if (this.configService.get('RESEND_API_KEY')) return 'resend';
        const gmailUser = this.configService.get<string>('GMAIL_USER');
        if (gmailUser && !gmailUser.startsWith('your_') && this.configService.get('GMAIL_APP_PASSWORD')) return 'gmail';
        if (this.configService.get('SMTP_HOST') && this.configService.get('SMTP_USER')) return 'smtp';
        return 'none';
    }

    static buildAlertHtml(params: {
        type: string;
        chain: string;
        address: string;
        message: string;
        riskScore?: number;
    }): string {
        const color = params.riskScore && params.riskScore >= 60
            ? '#e94560'
            : params.riskScore && params.riskScore >= 30
                ? '#f4a261'
                : '#2a9d8f';
        return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:Arial,sans-serif;color:#e5e7eb">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:24px">
    <tr><td>
      <div style="background:#1a1a2e;border-radius:12px;padding:24px;border:1px solid rgba(255,255,255,0.1)">
        <div style="font-size:20px;font-weight:bold;color:#fff;margin-bottom:4px">🛡️ CryptoShield Alert</div>
        <div style="font-size:12px;color:#9ca3af;margin-bottom:20px">${new Date().toLocaleString()}</div>
        <div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:16px;margin-bottom:16px">
          <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px">Alert type</div>
          <div style="font-size:16px;font-weight:600;color:${color};margin-top:4px">${params.type.replace(/_/g, ' ').toUpperCase()}</div>
        </div>
        <div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:12px;margin-bottom:8px">
          <div style="font-size:11px;color:#9ca3af">Chain</div>
          <div style="font-size:14px;color:#e5e7eb;margin-top:2px;text-transform:capitalize">${params.chain}</div>
        </div>
        <div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:12px;margin-bottom:8px">
          <div style="font-size:11px;color:#9ca3af">Address</div>
          <div style="font-size:13px;color:#e5e7eb;margin-top:2px;font-family:monospace;word-break:break-all">${params.address}</div>
        </div>
        ${params.riskScore !== undefined ? `
        <div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:12px;margin-bottom:8px">
          <div style="font-size:11px;color:#9ca3af">Risk score</div>
          <div style="font-size:24px;font-weight:bold;color:${color};margin-top:2px">${params.riskScore}/100</div>
        </div>` : ''}
        <div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:12px;margin-bottom:8px">
          <div style="font-size:11px;color:#9ca3af">Details</div>
          <div style="font-size:14px;color:#e5e7eb;margin-top:2px">${params.message}</div>
        </div>
        <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.08);font-size:11px;color:#6b7280;text-align:center">
          CryptoShield Intelligence Platform — automated alert
        </div>
      </div>
    </td></tr>
  </table>
</body>
</html>`;
    }
}
