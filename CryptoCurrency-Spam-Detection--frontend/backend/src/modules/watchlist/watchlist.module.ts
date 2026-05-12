import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WatchlistController } from './watchlist.controller';
import { WatchlistService } from './watchlist.service';
import { WatchlistRepository } from './watchlist.repository';
import { WatchlistMonitorService } from './watchlist-monitor.service';
import { Watchlist } from './entities/watchlist.entity';
import { AlertEntity } from '../alerts/alert.entity';
import { AlertSettingsEntity } from '../alerts/alert-settings.entity';
import { MiscModule } from '../misc/misc.module';
import { RiskScoringModule } from '../risk-scoring/risk-scoring.module';
import { FlaggedAddressesModule } from '../flagged-addresses/flagged-addresses.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Watchlist, AlertEntity, AlertSettingsEntity]),
    MiscModule,
    RiskScoringModule,
    FlaggedAddressesModule,
    forwardRef(() => AlertsModule),
  ],
  controllers: [WatchlistController],
  providers: [WatchlistService, WatchlistRepository, WatchlistMonitorService],
  exports: [WatchlistService, WatchlistRepository],
})
export class WatchlistModule { }
