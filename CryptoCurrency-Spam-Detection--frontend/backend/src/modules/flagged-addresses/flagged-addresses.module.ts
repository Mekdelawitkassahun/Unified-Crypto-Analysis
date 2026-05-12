import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { FlaggedAddressesController } from './flagged-addresses.controller';
import { FlaggedAddressesService } from './flagged-addresses.service';
import { FlaggedAddressesRepository } from './flagged-addresses.repository';
import { FlaggedAddress } from './entities/flagged-address.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FlaggedAddress]), ConfigModule],
  controllers: [FlaggedAddressesController],
  providers: [FlaggedAddressesService, FlaggedAddressesRepository],
  exports: [FlaggedAddressesService, FlaggedAddressesRepository],
})
export class FlaggedAddressesModule { }
