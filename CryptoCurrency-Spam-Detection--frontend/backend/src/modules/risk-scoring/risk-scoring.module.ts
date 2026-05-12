import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RiskScoringService } from './risk-scoring.service';
import { RiskScoringController } from './risk-scoring.controller';
import { FlaggedAddressesModule } from '../flagged-addresses/flagged-addresses.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { AddressRelationshipsModule } from '../address-relationships/address-relationships.module';
import { RiskAssessment } from './entities/risk-assessment.entity';
import { Address } from '../addresses/entities/address.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RiskAssessment, Address]),
    FlaggedAddressesModule,
    TransactionsModule,
    AddressRelationshipsModule,
  ],
  controllers: [RiskScoringController],
  providers: [RiskScoringService],
  exports: [RiskScoringService],
})
export class RiskScoringModule {}
