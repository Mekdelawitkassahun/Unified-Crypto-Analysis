import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from '../addresses/entities/address.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Watchlist } from '../watchlist/entities/watchlist.entity';
import { SearchQueryDto } from './dto/search-query.dto';
import { AuditLogService } from './audit-log.service';
import { SimulatorService } from './simulator.service';

@ApiTags('Audit')
@Controller('api/v1/audit')
export class AuditController {
  constructor(private readonly auditLogService: AuditLogService) { }

  @Get()
  @ApiOperation({ summary: 'Get audit log' })
  getAuditLog(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('actor') actor?: string,
    @Query('action') action?: string,
  ) {
    return this.auditLogService.list({ limit, offset, actor, action });
  }
}

@ApiTags('Search')
@Controller('api/v1/search')
export class SearchController {
  constructor(
    @InjectRepository(Address)
    private readonly addressesRepo: Repository<Address>,
    @InjectRepository(Transaction)
    private readonly transactionsRepo: Repository<Transaction>,
    @InjectRepository(Watchlist)
    private readonly watchlistRepo: Repository<Watchlist>,
  ) { }

  @Get()
  @ApiOperation({ summary: 'Global search' })
  async search(@Query() query: SearchQueryDto) {
    const q = query.q;
    const chain = query.chain;
    const term = (q ?? '').trim();
    if (!term || term.length < 2) {
      return { results: [], q, chain };
    }

    const chainWhere = chain ? 'AND chain = :chain' : '';
    const [addresses, txs, watchlist] = await Promise.all([
      this.addressesRepo.query(
        `SELECT address, chain, "riskScore" FROM addresses WHERE address ILIKE $1 ${chainWhere ? 'AND chain = $2' : ''} ORDER BY "riskScore" DESC LIMIT 8`,
        chain ? [`%${term}%`, chain] : [`%${term}%`],
      ),
      this.transactionsRepo.query(
        `SELECT "txHash", "fromAddress", "toAddress", chain FROM transactions WHERE "txHash" ILIKE $1 OR "fromAddress" ILIKE $1 OR "toAddress" ILIKE $1 ${chainWhere ? 'AND chain = $2' : ''} ORDER BY timestamp DESC LIMIT 8`,
        chain ? [`%${term}%`, chain] : [`%${term}%`],
      ),
      this.watchlistRepo.query(
        `SELECT id, address, chain FROM watchlist WHERE address ILIKE $1 ${chainWhere ? 'AND chain = $2' : ''} ORDER BY "createdAt" DESC LIMIT 8`,
        chain ? [`%${term}%`, chain] : [`%${term}%`],
      ),
    ]);

    const results = [
      ...addresses.map((a: any) => ({
        id: `addr-${a.address}`,
        type: 'address',
        title: a.address,
        subtitle: `Chain: ${a.chain} • Risk: ${Number(a.riskScore ?? 0)}`,
      })),
      ...txs.map((t: any) => ({
        id: `tx-${t.txHash}`,
        type: 'transaction',
        title: t.txHash,
        subtitle: `${t.fromAddress} -> ${t.toAddress} (${t.chain})`,
      })),
      ...watchlist.map((w: any) => ({
        id: `watch-${w.id}`,
        type: 'watchlist',
        title: w.address,
        subtitle: `Watchlist • ${w.chain}`,
      })),
    ];

    return { results, q, chain };
  }
}

@ApiTags('Simulate')
@Controller('api/v1/simulate')
export class SimulateController {
  constructor(private readonly simulatorService: SimulatorService) { }

  @Post('transaction')
  @ApiOperation({ summary: 'Simulate a transaction with risk analysis' })
  async simulateTransaction(
    @Body()
    body: {
      from: string;
      to: string;
      amount: number;
      chain?: string;
      data?: string;
    },
  ) {
    return this.simulatorService.simulate({
      from: body.from,
      to: body.to,
      amount: body.amount ?? 0,
      chain: body.chain ?? 'ethereum',
      data: body.data,
    });
  }
}
