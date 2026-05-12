import { Module } from '@nestjs/common';
import { BatchController } from './batch.controller';
import { BatchService } from './batch.service';
import { AddressesModule } from '../addresses/addresses.module';
import { MiscModule } from '../misc/misc.module';

@Module({
  imports: [AddressesModule, MiscModule],
  controllers: [BatchController],
  providers: [BatchService],
})
export class BatchModule {}
