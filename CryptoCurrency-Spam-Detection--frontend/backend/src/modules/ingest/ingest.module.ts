import { Module } from '@nestjs/common';
import { IngestController } from './ingest.controller';
import { IngestService } from './ingest.service';
import { AddressesModule } from '../addresses/addresses.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { AddressRelationshipsModule } from '../address-relationships/address-relationships.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [AddressesModule, TransactionsModule, AddressRelationshipsModule, AlertsModule],
  controllers: [IngestController],
  providers: [IngestService],
})
export class IngestModule {}
