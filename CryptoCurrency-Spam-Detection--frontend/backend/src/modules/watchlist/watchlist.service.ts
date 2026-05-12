import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Watchlist } from './entities/watchlist.entity';
import { getBlockchainEngineTimeoutMs } from '../../shared/utils/blockchain-engine-timeout.util';

@Injectable()
export class WatchlistService {
  private readonly logger = new Logger(WatchlistService.name);
  private readonly blockchainApiUrl: string;
  private readonly engineTimeoutMs: number;

  constructor(
    @InjectRepository(Watchlist)
    private readonly watchlistRepo: Repository<Watchlist>,
    private readonly configService: ConfigService,
  ) {
    this.blockchainApiUrl = this.configService.get<string>('BLOCKCHAIN_API_URL', 'http://127.0.0.1:8055');
    this.engineTimeoutMs = getBlockchainEngineTimeoutMs(this.configService);
  }

  async findAll(): Promise<Watchlist[]> {
    try {
      const items = await this.watchlistRepo.find({ order: { createdAt: 'DESC' } });

      // Merge with blockchain engine watchlist
      let engineItems: Watchlist[] = [];
      try {
        const response = await axios.get(`${this.blockchainApiUrl}/watchlist`, {
          timeout: this.engineTimeoutMs,
        });
        if (Array.isArray(response.data)) {
          engineItems = response.data.map((item: any) => ({
            id: item.id || crypto.randomUUID(),
            address: item.address,
            chain: item.chain,
            category: item.category,
            source: item.source,
            confidence: Number(item.confidence ?? 0),
            reviewerNotes: item.reviewer_notes,
            alerts_enabled: true,
            createdAt: new Date(item.created_at),
            updatedAt: new Date(item.updated_at),
          } as Watchlist));
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch watchlist from blockchain engine: ${(error as Error).message}`);
      }

      const allItems = [...items, ...engineItems];
      // Deduplicate by address+chain
      const seen = new Set<string>();
      return allItems.filter((item) => {
        const key = `${item.address.toLowerCase()}-${item.chain}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    } catch {
      return [];
    }
  }

  async findOne(id: string): Promise<Watchlist | null> {
    try {
      return await this.watchlistRepo.findOne({ where: { id } });
    } catch {
      return null;
    }
  }

  async add(body: {
    address: string;
    chain: string;
    name?: string;
    category?: string;
    source?: string;
    confidence?: number;
    reviewerNotes?: string;
  }): Promise<Watchlist> {
    try {
      const existing = await this.watchlistRepo.findOne({
        where: { address: body.address, chain: body.chain as any },
      });
      if (existing) return existing;

      const item = this.watchlistRepo.create({
        address: body.address,
        chain: body.chain as any,
        name: body.name,
        category: body.category,
        source: body.source,
        confidence: body.confidence ?? 0,
        reviewerNotes: body.reviewerNotes,
        alerts_enabled: true,
      });
      return await this.watchlistRepo.save(item);
    } catch {
      return {
        id: crypto.randomUUID(),
        address: body.address,
        chain: body.chain as any,
        userId: null as any,
        alertRules: {},
        name: body.name,
        category: body.category,
        source: body.source,
        confidence: body.confidence ?? 0,
        reviewerNotes: body.reviewerNotes,
        alerts_enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Watchlist;
    }
  }

  async update(
    id: string,
    payload: Partial<{
      name: string;
      alerts_enabled: boolean;
      category: string;
      source: string;
      confidence: number;
      reviewerNotes: string;
    }>,
  ): Promise<Watchlist> {
    try {
      const item = await this.watchlistRepo.findOne({ where: { id } });
      if (!item) throw new NotFoundException('Watchlist item not found');

      if (payload.name !== undefined) {
        (item as any).name = payload.name;
      }
      if (payload.alerts_enabled !== undefined) {
        (item as any).alerts_enabled = payload.alerts_enabled;
      }
      if (payload.category !== undefined) {
        (item as any).category = payload.category;
      }
      if (payload.source !== undefined) {
        (item as any).source = payload.source;
      }
      if (payload.confidence !== undefined) {
        (item as any).confidence = payload.confidence;
      }
      if (payload.reviewerNotes !== undefined) {
        (item as any).reviewerNotes = payload.reviewerNotes;
      }

      return await this.watchlistRepo.save(item);
    } catch {
      return {
        id,
        address: '',
        chain: 'ethereum' as any,
        userId: null as any,
        alertRules: {},
        name: payload.name,
        category: payload.category,
        source: payload.source,
        confidence: payload.confidence ?? 0,
        reviewerNotes: payload.reviewerNotes,
        alerts_enabled: payload.alerts_enabled ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Watchlist;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.watchlistRepo.delete(id);
    } catch {
      return;
    }
  }
}