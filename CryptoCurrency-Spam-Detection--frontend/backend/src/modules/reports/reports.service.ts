import { Injectable } from '@nestjs/common';
import { AddressesService } from '../addresses/addresses.service';
import { TransactionsService } from '../transactions/transactions.service';
import { RiskScoringService } from '../risk-scoring/risk-scoring.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import * as puppeteer from 'puppeteer';

@Injectable()
export class ReportsService {
  constructor(
    private readonly addressesService: AddressesService,
    private readonly transactionsService: TransactionsService,
    private readonly riskScoringService: RiskScoringService,
  ) {}

  async generatePdfReport(dto: GenerateReportDto): Promise<Buffer> {
    const [summary, risk, transactions] = await Promise.all([
      this.addressesService.getAddressSummary(dto.address, dto.chain),
      this.riskScoringService.calculateRisk(dto.address, dto.chain),
      this.transactionsService.findByAddress(dto.address, dto.chain, 100, 0),
    ]);

    const html = this.generateReportHtml(dto, summary, risk, transactions.data);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  private generateReportHtml(dto: GenerateReportDto, summary: any, risk: any, transactions: any[]): string {
    const txRows = transactions
      .map(
        (tx) => `
      <tr>
        <td>${tx.txHash.substring(0, 20)}...</td>
        <td>${tx.fromAddress.substring(0, 20)}...</td>
        <td>${tx.toAddress.substring(0, 20)}...</td>
        <td>${parseFloat(tx.amount).toFixed(4)} ETH</td>
        <td>${new Date(tx.timestamp).toLocaleDateString()}</td>
      </tr>
    `,
      )
      .join('');

    const riskFactors = risk.factors
      .map(
        (f: any) => `
      <li><strong>${f.factor}</strong> (+${f.points}): ${f.description}</li>
    `,
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          h1 { color: #1a1a2e; border-bottom: 3px solid #e94560; padding-bottom: 10px; }
          h2 { color: #16213e; margin-top: 30px; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
          .summary-card { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #e94560; }
          .summary-card h3 { margin: 0 0 8px 0; font-size: 14px; color: #666; text-transform: uppercase; }
          .summary-card p { margin: 0; font-size: 24px; font-weight: bold; color: #1a1a2e; }
          .risk-score { font-size: 48px; font-weight: bold; color: ${risk.score >= 60 ? '#e94560' : risk.score >= 30 ? '#f4a261' : '#2a9d8f'}; }
          .risk-level { display: inline-block; padding: 5px 15px; border-radius: 20px; background: ${risk.score >= 60 ? '#e9456020' : risk.score >= 30 ? '#f4a26120' : '#2a9d8f20'}; color: ${risk.score >= 60 ? '#e94560' : risk.score >= 30 ? '#f4a261' : '#2a9d8f'}; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #1a1a2e; color: white; }
          tr:hover { background: #f5f5f5; }
          .flagged { color: #e94560; font-weight: bold; }
          .safe { color: #2a9d8f; font-weight: bold; }
          ul { line-height: 1.8; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <h1>🔍 Crypto Intelligence Report</h1>
        <p><strong>Address:</strong> ${dto.address}</p>
        <p><strong>Chain:</strong> ${dto.chain}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>

        <h2>📊 Address Summary</h2>
        <div class="summary-grid">
          <div class="summary-card">
            <h3>Balance</h3>
            <p>${parseFloat(summary.balance).toFixed(4)} ETH</p>
          </div>
          <div class="summary-card">
            <h3>Total Received</h3>
            <p>${parseFloat(summary.totalReceived).toFixed(4)} ETH</p>
          </div>
          <div class="summary-card">
            <h3>Total Sent</h3>
            <p>${parseFloat(summary.totalSent).toFixed(4)} ETH</p>
          </div>
          <div class="summary-card">
            <h3>Transaction Count</h3>
            <p>${summary.txCount}</p>
          </div>
          <div class="summary-card">
            <h3>First Seen</h3>
            <p>${summary.firstSeen ? new Date(summary.firstSeen).toLocaleDateString() : 'N/A'}</p>
          </div>
          <div class="summary-card">
            <h3>Status</h3>
            <p class="${summary.isFlagged ? 'flagged' : 'safe'}">${summary.isFlagged ? '⚠️ FLAGGED' : '✅ SAFE'}</p>
          </div>
        </div>

        <h2>🎯 Risk Assessment</h2>
        <div class="summary-grid">
          <div class="summary-card">
            <h3>Risk Score</h3>
            <p class="risk-score">${risk.score}</p>
          </div>
          <div class="summary-card">
            <h3>Risk Level</h3>
            <p><span class="risk-level">${risk.level.toUpperCase()}</span></p>
          </div>
        </div>
        <p><strong>Recommendation:</strong> ${risk.recommendation}</p>
        
        <h3>Risk Factors (${risk.factors.length} found):</h3>
        <ul>${riskFactors || '<li>No significant risk factors detected</li>'}</ul>

        <h2>📋 Recent Transactions</h2>
        <table>
          <thead>
            <tr>
              <th>Tx Hash</th>
              <th>From</th>
              <th>To</th>
              <th>Amount</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${txRows || '<tr><td colspan="5" style="text-align:center;">No transactions found</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          <p>Generated by Crypto Intelligence Platform</p>
          <p>This report is for informational purposes only and does not constitute financial or legal advice.</p>
        </div>
      </body>
      </html>
    `;
  }
}
