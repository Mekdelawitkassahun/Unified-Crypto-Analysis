import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AddressesController } from './addresses.controller';
import { AddressesService } from './addresses.service';
import { AddressesRepository } from './addresses.repository';
import { Address } from './entities/address.entity';
import { RiskScoringModule } from '../risk-scoring/risk-scoring.module';
import { FlaggedAddressesModule } from '../flagged-addresses/flagged-addresses.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { AddressRelationshipsModule } from '../address-relationships/address-relationships.module';
import { MoralisService } from '../../common/services/moralis.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Address]),
    RiskScoringModule,
    FlaggedAddressesModule,
    TransactionsModule,
    AddressRelationshipsModule,
  ],
  controllers: [AddressesController],
  providers: [AddressesService, AddressesRepository, MoralisService],
  exports: [AddressesService, AddressesRepository],
})
export class AddressesModule {}
