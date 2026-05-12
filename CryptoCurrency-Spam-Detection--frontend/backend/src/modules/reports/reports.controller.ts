import { Controller, Post, Body, Res, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { AuditLogService } from '../misc/audit-log.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('api/v1/reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate PDF report for address' })
  async generateReport(@Body() dto: GenerateReportDto, @Res() res: Response, @Req() req: any) {
    const pdfBuffer = await this.reportsService.generatePdfReport(dto);
    await this.auditLogService.log({
      actor: req?.user?.email ?? req?.user?.sub ?? 'system',
      action: 'report.generate',
      resource: '/api/v1/reports/generate',
      meta: { address: dto.address, chain: dto.chain },
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="report-${dto.address}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }

  @Post('custom')
  @ApiOperation({ summary: 'Generate custom report' })
  async generateCustomReport(@Body() body: any, @Req() req: any) {
    await this.auditLogService.log({
      actor: req?.user?.email ?? req?.user?.sub ?? 'system',
      action: 'report.custom',
      resource: '/api/v1/reports/custom',
      meta: { template: body?.template ?? 'unknown' },
    });
    return { success: true, report: null };
  }
}