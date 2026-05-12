import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IndexerService } from './indexer.service';

@ApiTags('Indexer')
@Controller('api/v1/indexer')
export class IndexerController {
  constructor(private readonly indexerService: IndexerService) { }

  @Get('status')
  @ApiOperation({ summary: 'Get real-time indexer and chain status' })
  async getStatus() {
    return this.indexerService.getChainStatus();
  }

  @Post('reindex')
  @ApiOperation({ summary: 'Trigger manual reindex for an address' })
  async reindex(@Body() body: { address: string; blockRange?: string }) {
    return this.indexerService.triggerReindex(body.address, body.blockRange);
  }
}
