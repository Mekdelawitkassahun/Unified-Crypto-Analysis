import { Controller, Post, Body, UseInterceptors, UploadedFile, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { BatchService } from './batch.service';
import { BatchCheckDto } from './dto/batch-check.dto';
import { AddressSummaryDto } from '../addresses/dto/address-summary.dto';
import { AuditLogService } from '../misc/audit-log.service';

@ApiTags('Batch Operations')
@Controller('api/v1/batch')
export class BatchController {
  constructor(
    private readonly batchService: BatchService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post('check-addresses')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check multiple addresses for risk scores and balances' })
  @ApiResponse({ status: 200, type: [AddressSummaryDto] })
  async checkAddresses(
    @Body() dto: BatchCheckDto,
    @Req() req: any,
  ): Promise<AddressSummaryDto[]> {
    const result = await this.batchService.checkAddresses(dto);
    await this.auditLogService.log({
      actor: req?.user?.email ?? req?.user?.sub ?? 'system',
      action: 'batch.check',
      resource: '/api/v1/batch/check-addresses',
      meta: { chain: dto.chain, count: dto.addresses.length },
    });
    return result;
  }

  @Post('analyze')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Analyze addresses from a CSV file' })
  async analyzeCsv(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    const result = await this.batchService.analyzeCsv(file);
    await this.auditLogService.log({
      actor: req?.user?.email ?? req?.user?.sub ?? 'system',
      action: 'batch.analyze',
      resource: '/api/v1/batch/analyze',
      meta: { fileName: file?.originalname ?? 'unknown', resultCount: result?.results?.length ?? 0 },
    });
    return result;
  }
}
