import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { FlaggedAddressesService } from './modules/flagged-addresses/flagged-addresses.service';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly flaggedAddressesService: FlaggedAddressesService) { }

  async onModuleInit() {
    // Seed baseline flagged addresses on startup (non-blocking, with one retry)
    const runSync = async (attempt: number) => {
      try {
        const result = await this.flaggedAddressesService.syncPublicFeeds();
        this.logger.log(`Startup feed sync: ${result.synced} addresses seeded (${result.source})`);
      } catch (err) {
        if (attempt < 2) {
          // Retry once after 15s — engine may still be starting up
          setTimeout(() => runSync(attempt + 1), 15_000);
        } else {
          this.logger.warn(`Startup feed sync failed after retries: ${(err as Error).message}`);
        }
      }
    };
    setTimeout(() => runSync(1), 5_000);
  }

  getHello(): string {
    return 'Crypto Intelligence Platform API';
  }
}
