import { Body, Controller, Get, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AddCommentDto } from './dto/add-comment.dto';
import { TransactionsService } from './transactions.service';
import { Chain } from '../../shared/enums/chain.enum';

@ApiTags('Transactions')
@Controller('api/v1/transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get(':hash')
  @ApiOperation({ summary: 'Get transaction details by hash' })
  async getByHash(
    @Param('hash') hash: string,
    @Query('chain') chain?: Chain,
  ) {
    const tx = chain
      ? await this.transactionsService.findByTxHashAndChain(hash, chain)
      : await this.transactionsService.findByTxHash(hash);

    if (!tx) throw new NotFoundException('Transaction not found');
    return {
      hash: tx.txHash,
      chain: tx.chain,
      from: tx.fromAddress,
      to: tx.toAddress,
      amount: Number(tx.amount ?? 0),
      timestamp: tx.timestamp?.toISOString?.() ?? new Date().toISOString(),
      blockNumber: tx.blockNumber,
      type: tx.type ?? 'transfer',
    };
  }

  @Post(':hash/comment')
  @ApiOperation({ summary: 'Add investigation comment to transaction' })
  addComment(
    @Param('hash') hash: string,
    @Body() payload: AddCommentDto,
  ) {
    const now = new Date().toISOString();
    return {
      id: `${hash}-${Date.now()}`,
      hash,
      message: payload?.message ?? '',
      createdAt: now,
      author: 'Analyst',
      mentions: Array.isArray(payload?.mentions) ? payload.mentions : [],
      flagged: Boolean(payload?.flagged),
    };
  }
}
