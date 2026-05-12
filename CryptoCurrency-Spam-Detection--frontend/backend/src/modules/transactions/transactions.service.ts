import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TransactionsRepository } from './transactions.repository';
import { Transaction } from './entities/transaction.entity';
import { Chain } from '../../shared/enums/chain.enum';
import { PaginatedResponse } from '../../shared/interfaces/paginated-response.interface';
import { getBlockchainEngineTimeoutMs } from '../../shared/utils/blockchain-engine-timeout.util';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);
  private readonly blockchainApiUrl: string;
  private readonly engineTimeoutMs: number;

  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly configService: ConfigService,
  ) {
    this.blockchainApiUrl = this.configService.get<string>('BLOCKCHAIN_API_URL', 'http://127.0.0.1:8055');
    this.engineTimeoutMs = getBlockchainEngineTimeoutMs(this.configService);
  }
  private isEngineSupportedChain(chain: Chain): boolean {
    return chain !== Chain.SEPOLIA;
  }

  async findByTxHash(txHash: string): Promise<Transaction | null> {
    return this.transactionsRepository.findByTxHash(txHash);
  }

  async findByTxHashAndChain(txHash: string, chain: Chain): Promise<Transaction | null> {
    return this.transactionsRepository.findByTxHashAndChain(txHash, chain);
  }

  async findByAddress(
    address: string,
    chain: Chain,
    limit: number,
    offset: number,
  ): Promise<PaginatedResponse<Transaction>> {
    const [data, total] = await this.transactionsRepository.findByAddress(address, chain, limit, offset);

    if (data.length === 0 && this.isEngineSupportedChain(chain)) {
      try {
        const fetchLimit = Math.min(Math.max(offset + limit, limit), 100);
        const response = await axios.get(`${this.blockchainApiUrl}/explore/address`, {
          params: { address, chain: chain.toLowerCase(), limit: fetchLimit },
          timeout: this.engineTimeoutMs,
        });

        if (response.data && Array.isArray(response.data.transactions)) {
          const engineTxs = response.data.transactions as any[];
          const sliced = engineTxs.slice(offset, offset + limit);
          return {
            data: sliced.map(
              (tx: any) =>
                ({
                  id: tx.tx_hash,
                  txHash: tx.tx_hash,
                  fromAddress: tx.from_address ?? '',
                  toAddress: tx.to_address ?? '',
                  amount: tx.value,
                  timestamp: new Date(tx.timestamp),
                  chain: chain,
                  type: tx.tx_type || 'transfer',
                  blockNumber: tx.block_number ?? null,
                  gasPrice: 0,
                  gasUsed: 0,
                  createdAt: new Date(),
                }) as Transaction,
            ),
            total: engineTxs.length,
            page: Math.floor(offset / limit) + 1,
            limit,
            totalPages: Math.max(1, Math.ceil(engineTxs.length / limit)),
          };
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch transactions from blockchain engine: ${(error as Error).message}`);
      }
    }

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
      totalPages,
    };
  }

  async createTransaction(data: Partial<Transaction>): Promise<Transaction> {
    return this.transactionsRepository.create(data);
  }

  async getRecentTransactions(address: string, chain: Chain, hours: number = 24): Promise<Transaction[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recent = await this.transactionsRepository.findRecentByAddress(address, chain, since);
    if (recent.length > 0) return recent;

    // Fallback to external providers (Moralis/engine) through findByAddress,
    // then filter in-memory by lookback window.
    const hydrated = await this.findByAddress(address, chain, 200, 0);
    return hydrated.data.filter((tx) => new Date(tx.timestamp).getTime() >= since.getTime());
  }

  async calculateVelocity(address: string, chain: Chain, hours: number = 24): Promise<number> {
    const transactions = await this.getRecentTransactions(address, chain, hours);
    let totalVolume = 0;

    for (const tx of transactions) {
      if (tx.fromAddress.toLowerCase() === address.toLowerCase()) {
        totalVolume += tx.amount;
      }
    }

    return totalVolume;
  }

  async calculateTotals(address: string, chain: Chain) {
    return this.transactionsRepository.calculateTotalsByAddress(address, chain);
  }

  async findByAddressAllChains(address: string, limit: number): Promise<Transaction[]> {
    return this.transactionsRepository.findByAddressAllChains(address, limit);
  }
}
