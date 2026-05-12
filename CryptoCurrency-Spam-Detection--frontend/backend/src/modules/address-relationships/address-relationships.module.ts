import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AddressRelationship } from './entities/address-relationship.entity';
import { AddressRelationshipsRepository } from './address-relationships.repository';
import { AddressRelationshipsService } from './address-relationships.service';

@Module({
  imports: [TypeOrmModule.forFeature([AddressRelationship])],
  providers: [AddressRelationshipsRepository, AddressRelationshipsService],
  exports: [AddressRelationshipsRepository, AddressRelationshipsService],
})
export class AddressRelationshipsModule {}
