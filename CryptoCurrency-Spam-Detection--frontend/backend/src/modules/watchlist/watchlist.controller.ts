import { Controller, Get, Post, Delete, Patch, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WatchlistService } from './watchlist.service';
import { AuditLogService } from '../misc/audit-log.service';

@ApiTags('Watchlist')
@Controller('api/v1/watchlist')
export class WatchlistController {
  constructor(
    private readonly watchlistService: WatchlistService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get watchlist' })
  getWatchlist() {
    return this.watchlistService.findAll();
  }

  @Get(':address')
  @ApiOperation({ summary: 'Get watchlist item' })
  getOne(@Param('address') address: string) {
    return this.watchlistService.findOne(address);
  }

  @Post()
  @ApiOperation({ summary: 'Add to watchlist' })
  async add(
    @Body()
    body: {
      address: string;
      chain: string;
      name?: string;
      category?: string;
      source?: string;
      confidence?: number;
      reviewerNotes?: string;
    },
    @Req() req: any,
  ) {
    const item = await this.watchlistService.add(body);
    await this.auditLogService.log({
      actor: req?.user?.email ?? req?.user?.sub ?? 'system',
      action: 'watchlist.add',
      resource: '/api/v1/watchlist',
      meta: { address: item.address, chain: item.chain },
    });
    return item;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update watchlist item' })
  async update(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      name: string;
      alerts_enabled: boolean;
      category: string;
      source: string;
      confidence: number;
      reviewerNotes: string;
    }>,
    @Req() req: any,
  ) {
    const updated = await this.watchlistService.update(id, body);
    await this.auditLogService.log({
      actor: req?.user?.email ?? req?.user?.sub ?? 'system',
      action: 'watchlist.update',
      resource: `/api/v1/watchlist/${id}`,
      meta: body,
    });
    return updated;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove from watchlist' })
  async remove(@Param('id') id: string, @Req() req: any) {
    await this.watchlistService.remove(id);
    await this.auditLogService.log({
      actor: req?.user?.email ?? req?.user?.sub ?? 'system',
      action: 'watchlist.remove',
      resource: `/api/v1/watchlist/${id}`,
    });
    return { success: true };
  }
}