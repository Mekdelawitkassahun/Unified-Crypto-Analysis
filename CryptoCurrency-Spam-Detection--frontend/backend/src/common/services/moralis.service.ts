import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { Chain } from '../../shared/enums/chain.enum';

type MoralisBalanceResponse = {
  balance?: string;
};

type MoralisTx = {
  hash?: string;
  from_address?: string;
  to_address?: string | null;
  value?: string;
  block_timestamp?: string;
};

type MoralisTxResponse = {
  result?: MoralisTx[];
};

type MoralisDefiPosition = {
  protocol_name?: string;
  protocol_address?: string;
  total_usd_value?: number;
};

type MoralisDefiResponse = {
  result?: MoralisDefiPosition[];
};

type MoralisApprovalItem = {
  token_symbol?: string;
  spender_address?: string;
  value?: string;
  block_timestamp?: string;
};

type MoralisApprovalResponse = {
  result?: MoralisApprovalItem[];
};

@Injectable()
export class MoralisService {
  private readonly logger = new Logger(MoralisService.name);
  private readonly apiKey?: string;
  private readonly client: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('MORALIS_API_KEY');
    this.client = axios.create({
      baseURL: 'https://deep-index.moralis.io/api/v2.2',
      timeout: 10000,
    });
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async getNativeBalance(address: string, chain: Chain): Promise<number | null> {
    if (!this.apiKey) return null;
    if (!this.isAddressCompatibleForMoralis(address, chain)) return null;
    try {
      const isSolana = chain === Chain.SOLANA;
      const path = isSolana ? `/solana/${address}/balance` : `/${address}/balance`;
      const res = await this.client.get<MoralisBalanceResponse>(path, {
        params: isSolana ? {} : { chain: this.toMoralisChain(chain) },
        headers: { 'X-API-Key': this.apiKey },
      });
      const balanceRaw = Number(res.data?.balance ?? 0);
      if (!Number.isFinite(balanceRaw)) return null;
      // Solana uses 9 decimals (lamports), EVM uses 18 (wei)
      const divisor = isSolana ? 1e9 : 1e18;
      return balanceRaw / divisor;
    } catch (error) {
      this.logger.warn(`Failed to fetch Moralis balance for ${address}: ${this.describeAxiosError(error)}`);
      return null;
    }
  }

  async getWalletTransactions(
    address: string,
    chain: Chain,
    limit = 50,
  ): Promise<Array<{ hash: string; from: string; to: string; amount: number; timestamp: string }>> {
    if (!this.apiKey) return [];
    if (!this.isAddressCompatibleForMoralis(address, chain)) return [];
    try {
      const safeLimit = Math.max(1, Math.min(100, Number(limit) || 50));
      const isSolana = chain === Chain.SOLANA;
      const path = isSolana ? `/solana/${address}/history` : `/${address}`;
      const res = await this.client.get<MoralisTxResponse>(path, {
        params: isSolana ? { limit: safeLimit } : { chain: this.toMoralisChain(chain), limit: safeLimit },
        headers: { 'X-API-Key': this.apiKey },
      });
      const rows = Array.isArray(res.data?.result) ? res.data.result : [];
      const divisor = isSolana ? 1e9 : 1e18;
      
      return rows.map((tx) => ({
        hash: tx.hash ?? '',
        from: tx.from_address ?? '',
        to: tx.to_address ?? '',
        amount: Number(tx.value ?? 0) / divisor,
        timestamp: tx.block_timestamp ?? new Date().toISOString(),
      }));
    } catch (error) {
      this.logger.warn(`Failed to fetch Moralis txs for ${address}: ${this.describeAxiosError(error)}`);
      return [];
    }
  }

  async getDefiPositions(address: string, chain: Chain): Promise<MoralisDefiPosition[]> {
    if (!this.apiKey) return [];
    if (!this.isAddressCompatibleForMoralis(address, chain)) return [];
    try {
      const res = await this.client.get<MoralisDefiResponse>(`/wallets/${address}/defi/positions`, {
        params: { chain: this.toMoralisChain(chain) },
        headers: { 'X-API-Key': this.apiKey },
      });
      return Array.isArray(res.data?.result) ? res.data.result : [];
    } catch (error) {
      this.logger.warn(`Failed to fetch Moralis DeFi positions for ${address}: ${this.describeAxiosError(error)}`);
      return [];
    }
  }

  async getTokenApprovals(address: string, chain: Chain): Promise<MoralisApprovalItem[]> {
    if (!this.apiKey) return [];
    if (!this.isAddressCompatibleForMoralis(address, chain)) return [];
    try {
      const res = await this.client.get<MoralisApprovalResponse>(`/wallets/${address}/approvals`, {
        params: { chain: this.toMoralisChain(chain) },
        headers: { 'X-API-Key': this.apiKey },
      });
      return Array.isArray(res.data?.result) ? res.data.result : [];
    } catch (error) {
      this.logger.warn(`Failed to fetch Moralis approvals for ${address}: ${this.describeAxiosError(error)}`);
      return [];
    }
  }

  private isAddressCompatibleForMoralis(address: string, chain: Chain): boolean {
    const value = (address ?? '').trim();
    if (!value) return false;
    if (chain === Chain.SOLANA) return !value.startsWith('0x');
    if (chain === Chain.BITCOIN) return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{20,}$/i.test(value);
    return /^0x[a-fA-F0-9]{40}$/.test(value);
  }

  private describeAxiosError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const payload = error.response?.data;
      if (status) {
        const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
        return `status ${status}${body ? ` - ${body}` : ''}`;
      }
    }
    return (error as Error).message;
  }

  private toMoralisChain(chain: Chain): string {
    switch (chain) {
      case Chain.ETHEREUM:
        return 'eth';
      case Chain.POLYGON:
        return 'polygon';
      case Chain.BSC:
        return 'bsc';
      case Chain.ARBITRUM:
        return 'arbitrum';
      case Chain.OPTIMISM:
        return 'optimism';
      case Chain.AVALANCHE:
        return 'avalanche';
      case Chain.SEPOLIA:
        return 'sepolia';
      case Chain.FANTOM:
        return 'fantom';
      case Chain.BASE:
        return 'base';
      case Chain.CELO:
        return 'celo';
      case Chain.GNOSIS:
        return 'gnosis';
      case Chain.CRONOS:
        return 'cronos';
      case Chain.MOONBEAM:
        return 'moonbeam';
      case Chain.METIS:
        return 'metis';
      case Chain.KAVA:
        return 'kava';
      case Chain.BITCOIN:
        return 'btc';
      case Chain.SOLANA:
        return 'solana';
      default:
        return 'eth';
    }
  }
}
