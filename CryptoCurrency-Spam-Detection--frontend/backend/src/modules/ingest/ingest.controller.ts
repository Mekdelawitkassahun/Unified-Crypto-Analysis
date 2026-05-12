import { Controller, Post, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { IngestService } from './ingest.service';
import { IngestTransactionDto } from './dto/ingest-transaction.dto';
import { ConfigService } from '@nestjs/config';

@ApiTags('Internal - Ingest')
@Controller('api/v1/internal/ingest')
export class IngestController {
  constructor(
    private readonly ingestService: IngestService,
    private readonly configService: ConfigService,
  ) {}

  @Post('transaction')
  @ApiOperation({ summary: 'Ingest a transaction (internal use only)' })
  @ApiHeader({ name: 'x-internal-api-key', required: true })
  async ingestTransaction(
    @Body() dto: IngestTransactionDto,
    @Headers('x-internal-api-key') apiKey: string,
  ) {
    // Simple API key check for internal endpoint
    const expectedKey = this.configService.get('INTERNAL_API_KEY', 'internal-secret-key');
    if (apiKey !== expectedKey) {
      throw new UnauthorizedException('Invalid internal API key');
    }

    return this.ingestService.processTransaction(dto);
  }
}
