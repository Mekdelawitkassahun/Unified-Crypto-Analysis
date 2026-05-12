import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Chain } from '../../shared/enums/chain.enum';
import { AddressRelationship } from './entities/address-relationship.entity';

@Injectable()
export class AddressRelationshipsRepository {
  private readonly repository: Repository<AddressRelationship>;

  constructor(private readonly dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(AddressRelationship);
  }

  async create(data: Partial<AddressRelationship>): Promise<AddressRelationship> {
    const relationship = this.repository.create(data);
    return this.repository.save(relationship);
  }

  async findByAddressWithDepth(address: string, chain: Chain, depth: number): Promise<AddressRelationship[]> {
    return this.repository
      .createQueryBuilder('ar')
      .where('ar.chain = :chain', { chain })
      .andWhere('(LOWER(ar.fromAddress) = LOWER(:address) OR LOWER(ar.toAddress) = LOWER(:address))', { address })
      .andWhere('ar.hopDistance <= :depth', { depth })
      .orderBy('ar.createdAt', 'DESC')
      .take(1000)
      .getMany();
  }

  async findByAddressAndHopDistance(address: string, chain: Chain, hopDistance: number): Promise<AddressRelationship[]> {
    return this.repository
      .createQueryBuilder('ar')
      .where('ar.chain = :chain', { chain })
      .andWhere('(LOWER(ar.fromAddress) = LOWER(:address) OR LOWER(ar.toAddress) = LOWER(:address))', { address })
      .andWhere('ar.hopDistance = :hopDistance', { hopDistance })
      .orderBy('ar.createdAt', 'DESC')
      .take(500)
      .getMany();
  }
}
