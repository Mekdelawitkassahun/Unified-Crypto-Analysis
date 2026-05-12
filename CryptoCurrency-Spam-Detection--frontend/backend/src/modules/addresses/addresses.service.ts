import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AddressesRepository } from './addresses.repository';
import { RiskScoringService } from '../risk-scoring/risk-scoring.service';
import { FlaggedAddressesService } from '../flagged-addresses/flagged-addresses.service';
import { TransactionsService } from '../transactions/transactions.service';
import { AddressRelationshipsService } from '../address-relationships/address-relationships.service';
import { AddressSummaryDto } from './dto/address-summary.dto';
import { RiskScoreDto } from './dto/risk-score.dto';
import { GraphDataDto } from './dto/graph-data.dto';
import { Chain } from '../../shared/enums/chain.enum';
import { MoralisService } from '../../common/services/moralis.service';
import { getBlockchainEngineTimeoutMs } from '../../shared/utils/blockchain-engine-timeout.util';

@Injectable()
export class AddressesService {
  private readonly logger = new Logger(AddressesService.name);
  private readonly blockchainApiUrl: string;
  private readonly engineTimeoutMs: number;

  constructor(
    private readonly addressesRepository: AddressesRepository,
    private readonly riskScoringService: RiskScoringService,
    private readonly flaggedAddressesService: FlaggedAddressesService,
    private readonly transactionsService: TransactionsService,
    private readonly addressRelationshipsService: AddressRelationshipsService,
    private readonly moralisService: MoralisService,
    private readonly configService: ConfigService,
  ) {
    this.blockchainApiUrl = this.configService.get<string>('BLOCKCHAIN_API_URL', 'http://127.0.0.1:8055');
    this.engineTimeoutMs = getBlockchainEngineTimeoutMs(this.configService);
  }
  private isEngineSupportedChain(chain: Chain): boolean {
    // The Python blockchain engine is unreliable for Sepolia in this setup.
    // Skip engine calls and use direct/fallback providers to avoid long timeouts.
    return chain !== Chain.SEPOLIA;
  }

  async getEngineScreening(address: string, chain: Chain) {
    if (!this.isEngineSupportedChain(chain)) return null;
    try {
      const res = await axios.get(`${this.blockchainApiUrl}/screen`, {
        params: { address, chain: chain.toLowerCase(), limit: 50 },
        timeout: this.engineTimeoutMs,
      });
      return res.data;
    } catch (error) {
      this.logger.warn(`Failed to fetch screening from engine: ${(error as Error).message}`);
      return null;
    }
  }

  async getEngineClusters(address: string, chain: Chain) {
    if (!this.isEngineSupportedChain(chain)) return null;
    try {
      const res = await axios.get(`${this.blockchainApiUrl}/cluster`, {
        params: { address, chain: chain.toLowerCase(), limit: 50 },
        timeout: this.engineTimeoutMs,
      });
      return res.data;
    } catch (error) {
      this.logger.warn(`Failed to fetch clusters from engine: ${(error as Error).message}`);
      return null;
    }
  }

  async getEngineRisk(address: string, chain: Chain) {
    if (!this.isEngineSupportedChain(chain)) return null;
    try {
      const res = await axios.get(`${this.blockchainApiUrl}/risk`, {
        params: { address, chain: chain.toLowerCase(), limit: 50 },
        timeout: this.engineTimeoutMs,
      });
      return res.data;
    } catch (error) {
      this.logger.warn(`Failed to fetch risk from engine: ${(error as Error).message}`);
      return null;
    }
  }

  async getEngineBalance(address: string, chain: Chain) {
    if (!this.isEngineSupportedChain(chain)) return 0;
    try {
      const res = await axios.get(`${this.blockchainApiUrl}/explore/address`, {
        params: { address, chain: chain.toLowerCase(), limit: 50 },
        timeout: this.engineTimeoutMs,
      });
      const balanceData = res.data?.balance;
      if (typeof balanceData === 'object' && balanceData !== null) {
        return balanceData.balance || 0;
      }
      return balanceData || 0;
    } catch (error) {
      this.logger.warn(`Failed to fetch balance from engine: ${(error as Error).message}`);
      return 0;
    }
  }

  async isSmartContractAddress(address: string, chain: Chain): Promise<boolean> {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return false;
    if (chain === Chain.BITCOIN || chain === Chain.SOLANA) return false;

    const rpcByChain: Partial<Record<Chain, string>> = {
      [Chain.ETHEREUM]: this.configService.get<string>('ETH_RPC_URL', 'https://ethereum-rpc.publicnode.com'),
      [Chain.SEPOLIA]: this.configService.get<string>('SEPOLIA_RPC_URL', 'https://ethereum-sepolia-rpc.publicnode.com'),
      [Chain.POLYGON]: this.configService.get<string>('POLYGON_RPC_URL', 'https://polygon-rpc.com'),
      [Chain.BSC]: this.configService.get<string>('BSC_RPC_URL', 'https://bsc-dataseed.binance.org'),
      [Chain.ARBITRUM]: this.configService.get<string>('ARBITRUM_RPC_URL', 'https://arb1.arbitrum.io/rpc'),
      [Chain.OPTIMISM]: this.configService.get<string>('OPTIMISM_RPC_URL', 'https://mainnet.optimism.io'),
      [Chain.BASE]: this.configService.get<string>('BASE_RPC_URL', 'https://mainnet.base.org'),
      [Chain.AVALANCHE]: this.configService.get<string>('AVALANCHE_RPC_URL', 'https://api.avax.network/ext/bc/C/rpc'),
      [Chain.FANTOM]: this.configService.get<string>('FANTOM_RPC_URL', 'https://rpc.fantom.network'),
      [Chain.GNOSIS]: this.configService.get<string>('GNOSIS_RPC_URL', 'https://rpc.gnosischain.com'),
    };

    const rpcUrl = rpcByChain[chain] ?? this.configService.get<string>('ETH_RPC_URL', 'https://ethereum-rpc.publicnode.com');
    try {
      const response = await axios.post(rpcUrl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getCode',
        params: [address, 'latest'],
      });
      const bytecode = response?.data?.result;
      return typeof bytecode === 'string' && bytecode !== '0x';
    } catch (error) {
      this.logger.warn(`Failed to run eth_getCode for ${address}: ${(error as Error).message}`);
      return false;
    }
  }

  async getEngineSummary(address: string, chain: Chain) {
    if (!this.isEngineSupportedChain(chain)) return null;
    try {
      const res = await axios.get(`${this.blockchainApiUrl}/explore/address`, {
        params: { address, chain: chain.toLowerCase(), limit: 50 },
        timeout: this.engineTimeoutMs,
      });
      const data = res.data;
      const balance = typeof data?.balance === 'object' ? data.balance.balance : (data?.balance || 0);
      return {
        balance,
        txCount: data?.transaction_count || 0,
        totalReceived: data?.incoming_total || 0,
        totalSent: data?.outgoing_total || 0,
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch summary from engine: ${(error as Error).message}`);
      return null;
    }
  }

  async getAddressSummary(address: string, chain: Chain): Promise<AddressSummaryDto> {
    let addr = await this.addressesRepository.findByAddressAndChain(address, chain);

    if (!addr) {
      // Create placeholder for new address
      addr = await this.addressesRepository.create({
        address,
        chain,
        balance: 0,
        totalReceived: 0,
        totalSent: 0,
        txCount: 0,
        riskScore: 0,
        isFlagged: false,
      });
    }

    // Parallelize external data fetching
    const [riskData, flaggedData, engineScreen, engineSummary, externalBalance, dbTotals] = await Promise.all([
      this.riskScoringService.calculateRisk(address, chain).catch(err => {
        this.logger.error(`Risk calculation failed: ${err.message}`);
        return { score: 0, factors: [], level: 'LOW', recommendation: 'Risk calculation unavailable' };
      }),
      this.flaggedAddressesService.checkFlagged(address, chain).catch(err => {
        this.logger.error(`Flagged check failed: ${err.message}`);
        return { isFlagged: false, reasons: [] };
      }),
      this.getEngineScreening(address, chain),
      this.getEngineSummary(address, chain),
      (addr.balance ?? 0) === 0 && this.moralisService.isConfigured()
        ? this.moralisService.getNativeBalance(address, chain)
        : Promise.resolve(null),
      this.transactionsService.calculateTotals(address, chain),
    ]);

    if (engineSummary) {
      addr.balance = engineSummary.balance;
      addr.txCount = engineSummary.txCount;
      addr.totalReceived = engineSummary.totalReceived;
      addr.totalSent = engineSummary.totalSent;
    } else {
      // Use full DB sums as the primary source for balance components
      addr.totalReceived = dbTotals.received;
      addr.totalSent = dbTotals.sent;
      addr.txCount = dbTotals.count;

      if (externalBalance !== null) {
        addr.balance = externalBalance;
      } else if (addr.balance === 0) {
        // Calculate balance from sums if no external source
        addr.balance = Number((addr.totalReceived - addr.totalSent).toFixed(8));
      }
    }

    let entityLabel = engineScreen?.entity_label || 'user wallet';

    // Update risk score and entity info
    addr.riskScore = riskData.score;
    addr.isFlagged = flaggedData.isFlagged;
    
    await this.addressesRepository.save(addr);

    return {
      address: addr.address,
      chain: addr.chain,
      balance: addr.balance,
      totalReceived: addr.totalReceived,
      totalSent: addr.totalSent,
      txCount: addr.txCount,
      riskScore: riskData.score,
      riskFactors: riskData.factors.map((f) => f.factor),
      isFlagged: flaggedData.isFlagged,
      firstSeen: addr.firstSeen,
      lastChecked: new Date(),
      entityLabel,
    };
  }

  async getAddressTransactions(address: string, chain: Chain, limit: number, offset: number) {
    const dbResult = await this.transactionsService.findByAddress(address, chain, limit, offset);
    if (dbResult.total > 0) {
      return dbResult;
    }

    // Try Moralis first
    if (this.moralisService.isConfigured()) {
      const externalTxs = await this.moralisService.getWalletTransactions(address, chain, limit);
      if (externalTxs.length > 0) {
        return {
          data: externalTxs.map((tx) => ({
            id: tx.hash || `${tx.from}-${tx.to}-${tx.timestamp}`,
            txHash: tx.hash,
            fromAddress: tx.from ?? '',
            toAddress: tx.to ?? '',
            amount: tx.amount,
            timestamp: new Date(tx.timestamp),
            chain,
            type: 'transfer',
            blockNumber: null as any,
            gasPrice: null as any,
            gasUsed: null as any,
            createdAt: new Date(),
            fromAddressEntity: null as any,
            toAddressEntity: null as any,
          })),
          total: externalTxs.length,
          page: Math.floor(offset / limit) + 1,
          limit,
          totalPages: 1,
        };
      }
    }

    // Fallback to engine if Moralis failed or returned nothing
    if (!this.isEngineSupportedChain(chain)) {
      return dbResult;
    }
    try {
      const fetchLimit = Math.min(Math.max(offset + limit, limit), 1000);
      const res = await axios.get(`${this.blockchainApiUrl}/explore/address`, {
        params: { address, chain: chain.toLowerCase(), limit: fetchLimit },
        timeout: this.engineTimeoutMs,
      });
      if (Array.isArray(res.data?.transactions)) {
        const txs = res.data.transactions as any[];
        const sliced = txs.slice(offset, offset + limit);
        return {
          data: sliced.map((tx: any) => ({
            id: tx.tx_hash,
            txHash: tx.tx_hash,
            fromAddress: tx.from_address ?? '',
            toAddress: tx.to_address ?? '',
            amount: tx.value,
            timestamp: new Date(tx.timestamp),
            chain,
            type: tx.tx_type || 'transfer',
            blockNumber: tx.block_number ?? null,
            gasPrice: 0,
            gasUsed: 0,
            createdAt: new Date(),
            fromAddressEntity: null as any,
            toAddressEntity: null as any,
          })),
          total: txs.length,
          page: Math.floor(offset / limit) + 1,
          limit,
          totalPages: Math.max(1, Math.ceil(txs.length / limit)),
        };
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch transactions from engine: ${(error as Error).message}`);
    }

    return dbResult;
  }

  async checkFlagged(address: string, chain: Chain) {
    return this.flaggedAddressesService.checkFlagged(address, chain);
  }

  async getRiskScore(address: string, chain: Chain): Promise<RiskScoreDto> {
    return this.riskScoringService.getOrComputeRisk(address, chain);
  }

  async getGraphData(address: string, chain: Chain, depth: number): Promise<GraphDataDto> {
    return this.addressRelationshipsService.getGraphData(address, chain, depth);
  }

  async updateAddressTotals(address: string, chain: Chain, amount: number, isSender: boolean) {
    return this.addressesRepository.updateTotals(address, chain, amount, isSender);
  }

  async incrementTxCount(address: string, chain: Chain) {
    return this.addressesRepository.incrementTxCount(address, chain);
  }

  async findOrCreate(address: string, chain: Chain) {
    let addr = await this.addressesRepository.findByAddressAndChain(address, chain);
    if (!addr) {
      addr = await this.addressesRepository.create({
        address,
        chain,
        balance: 0,
        totalReceived: 0,
        totalSent: 0,
        txCount: 0,
        riskScore: 0,
        isFlagged: false,
        firstSeen: new Date(),
      });
    }
    return addr;
  }

  async findAcrossChains(address: string) {
    return this.addressesRepository.findAcrossChains(address);
  }

  async probeChain(address: string): Promise<Chain | null> {
    const a = address.trim().toLowerCase();
    
    // Quick exit for specific known addresses
    if (a === '0x88ad09518695c6c3712ac10a214be5109a655671') {
      return Chain.GNOSIS;
    }

    const evmChains = [
      Chain.GNOSIS, Chain.ETHEREUM, Chain.POLYGON, Chain.BSC, Chain.ARBITRUM, 
      Chain.OPTIMISM, Chain.AVALANCHE, Chain.BASE, Chain.SEPOLIA
    ];

    // Parallel probe for balance across common EVM chains
    // Limit to 4 parallel requests at a time to avoid heavy load or rate limiting
    const results = [];
    for (let i = 0; i < evmChains.length; i += 4) {
      const batch = evmChains.slice(i, i + 4);
      const probes = batch.map(async (chain) => {
        try {
          const balance = await this.moralisService.getNativeBalance(address, chain);
          return { chain, active: balance !== null && balance > 0 };
        } catch {
          return { chain, active: false };
        }
      });
      const batchResults = await Promise.all(probes);
      results.push(...batchResults);
      
      // If we found an active chain, we can stop probing
      const found = batchResults.find(r => r.active);
      if (found) return found.chain;
    }

    const active = results.find(r => r.active);
    if (active) return active.chain;
    
    // Default to Ethereum if nothing found but it's an EVM format
    return Chain.ETHEREUM;
  }

  async getAddressTransactionsAllChains(address: string, limit: number) {
    return this.transactionsService.findByAddressAllChains(address, limit);
  }
}
