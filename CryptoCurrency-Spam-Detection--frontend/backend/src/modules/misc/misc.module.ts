import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AuditController,
  SearchController,
  SimulateController,
} from './misc.controllers';
import { IndexerController } from './indexer.controller';
import { OrganizationController } from './organization.controller';
import { Address } from '../addresses/entities/address.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Watchlist } from '../watchlist/entities/watchlist.entity';
import { AuditLog } from './entities/audit-log.entity';
import { ApiKey } from './entities/api-key.entity';
import { ApiUsage } from './entities/api-usage.entity';
import { AuditLogService } from './audit-log.service';
import { OrganizationService } from './organization.service';
import { IndexerService } from './indexer.service';
import { SimulatorService } from './simulator.service';
import { FlaggedAddressesModule } from '../flagged-addresses/flagged-addresses.module';
import { RiskScoringModule } from '../risk-scoring/risk-scoring.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Address, Transaction, Watchlist, AuditLog, ApiKey, ApiUsage]),
    FlaggedAddressesModule,
    RiskScoringModule,
  ],
  controllers: [
    AuditController,
    IndexerController,
    OrganizationController,
    SearchController,
    SimulateController,
  ],
  providers: [AuditLogService, OrganizationService, IndexerService, SimulatorService],
  exports: [AuditLogService],
})
export class MiscModule { }
