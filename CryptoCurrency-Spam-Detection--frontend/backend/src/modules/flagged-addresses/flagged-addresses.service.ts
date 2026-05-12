import { Injectable, Logger } from '@nestjs/common';
import { FlaggedAddressesRepository } from './flagged-addresses.repository';
import { FlaggedAddressResponseDto } from './dto/flagged-address.dto';
import { Chain } from '../../shared/enums/chain.enum';
import { FlaggedAddress } from './entities/flagged-address.entity';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class FlaggedAddressesService {
  private readonly logger = new Logger(FlaggedAddressesService.name);

  constructor(
    private readonly flaggedAddressesRepository: FlaggedAddressesRepository,
    private readonly configService: ConfigService,
  ) { }

  async checkFlagged(address: string, chain: Chain): Promise<FlaggedAddressResponseDto> {
    const flagged = await this.flaggedAddressesRepository.findByAddressAndChain(address, chain);

    if (!flagged || flagged.length === 0) {
      return { isFlagged: false, reasons: [] };
    }

    return {
      isFlagged: true,
      reasons: flagged.map((f) => f.reason),
    };
  }

  async findAll(chain?: Chain): Promise<FlaggedAddress[]> {
    if (chain) {
      return this.flaggedAddressesRepository.findByChain(chain);
    }
    return this.flaggedAddressesRepository.findAll();
  }

  async isDirectlyFlagged(address: string, chain: Chain): Promise<boolean> {
    const flagged = await this.flaggedAddressesRepository.findByAddressAndChain(address, chain);
    return flagged.some((f) => f.hopDistance === 1);
  }

  async getFlaggedAtHopDistance(address: string, chain: Chain, hopDistance: number): Promise<FlaggedAddress[]> {
    return this.flaggedAddressesRepository.findByAddressAndHopDistance(address, chain, hopDistance);
  }

  async createFlagged(data: Partial<FlaggedAddress>): Promise<FlaggedAddress> {
    return this.flaggedAddressesRepository.create(data);
  }

  async importMany(
    items: Array<{
      address: string;
      chain: Chain;
      reason: string;
      source?: string;
      hopDistance?: number;
    }>,
  ): Promise<{ imported: number }> {
    let imported = 0;
    for (const item of items) {
      await this.flaggedAddressesRepository.delete(item.address, item.chain).catch(() => undefined);
      await this.flaggedAddressesRepository.create({
        address: item.address,
        chain: item.chain,
        reason: item.reason,
        source: item.source ?? 'manual_import',
        hopDistance: item.hopDistance ?? 1,
      });
      imported += 1;
    }
    return { imported };
  }

  async syncPublicFeeds(): Promise<{ synced: number; source: string }> {
    // Try to trigger the Python engine's feed sync first
    const engineUrl = this.configService.get<string>('BLOCKCHAIN_API_URL', 'http://127.0.0.1:8055');
    let engineSynced = 0;

    try {
      const res = await axios.get(`${engineUrl}/feeds/sync`, { timeout: 10000 });
      if (res.data?.synced) {
        this.logger.log(`Engine synced feeds: ${JSON.stringify(res.data.synced)}`);
        engineSynced = Object.values(res.data.synced as Record<string, number>).reduce(
          (sum: number, v) => sum + (typeof v === 'number' ? v : 0),
          0,
        );
      }
    } catch (err) {
      this.logger.warn(`Engine feed sync unavailable: ${(err as Error).message}`);
    }

    // Always seed the known OFAC/Tornado Cash addresses as a baseline
    const seeded = [
      {
        address: '0x722122df12d4e14e13ac3b6895a86e84145b6967',
        chain: Chain.ETHEREUM,
        reason: 'Tornado Cash mixer contract (OFAC sanctioned)',
        source: 'OFAC',
      },
      {
        address: '0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936',
        chain: Chain.ETHEREUM,
        reason: 'Tornado Cash mixer contract (OFAC sanctioned)',
        source: 'OFAC',
      },
      {
        address: '0xd90e2f925da726b50c4ed8d0fb90ad053324f31b',
        chain: Chain.ETHEREUM,
        reason: 'Tornado Cash router (OFAC sanctioned)',
        source: 'OFAC',
      },
      {
        address: '0x910cbd523d972eb0a6f4cae4618ad62622b39dbf',
        chain: Chain.ETHEREUM,
        reason: 'Tornado Cash 100 ETH pool (OFAC sanctioned)',
        source: 'OFAC',
      },
      {
        address: '0xa160cdab225685da1d56aa342ad8841c3b53f291',
        chain: Chain.ETHEREUM,
        reason: 'Tornado Cash 1 ETH pool (OFAC sanctioned)',
        source: 'OFAC',
      },
      {
        address: '0x000000000000000000000000000000000000dead',
        chain: Chain.ETHEREUM,
        reason: 'Known burn/suspicious sink address',
        source: 'community',
      },
      {
        address: '0x1111111111111111111111111111111111111111',
        chain: Chain.POLYGON,
        reason: 'Suspected phishing receiver reported by community',
        source: 'community',
      },
      // Known ransomware Bitcoin addresses
      {
        address: '13AM4VW2dhxYgXBGnSpxh7i7F5MDRiF5nF',
        chain: Chain.BITCOIN,
        reason: 'WannaCry ransomware payment address',
        source: 'RansomwareTracker',
      },
      {
        address: '12t9YDPgwueZ9NyMgw519p7AA8isjr6SMw',
        chain: Chain.BITCOIN,
        reason: 'CryptoLocker ransomware payment address',
        source: 'RansomwareTracker',
      },
    ];

    const result = await this.importMany(seeded);
    const totalSynced = result.imported + engineSynced;

    return {
      synced: totalSynced,
      source: engineSynced > 0 ? 'engine+seed' : 'seed_only',
    };
  }
}
