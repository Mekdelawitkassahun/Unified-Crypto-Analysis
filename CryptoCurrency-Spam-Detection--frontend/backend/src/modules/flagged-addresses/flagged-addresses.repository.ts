import { Injectable } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { FlaggedAddress } from './entities/flagged-address.entity';
import { Chain } from '../../shared/enums/chain.enum';

@Injectable()
export class FlaggedAddressesRepository {
  private repository: Repository<FlaggedAddress>;

  constructor(private dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(FlaggedAddress);
  }

  async findByAddressAndChain(address: string, chain: Chain): Promise<FlaggedAddress[]> {
    return this.repository.find({
      where: { address, chain },
    });
  }

  async findByAddressAndHopDistance(address: string, chain: Chain, hopDistance: number): Promise<FlaggedAddress[]> {
    return this.repository.find({
      where: { address, chain, hopDistance },
    });
  }

  async findByChain(chain: Chain): Promise<FlaggedAddress[]> {
    return this.repository.find({ where: { chain } });
  }

  async findAll(): Promise<FlaggedAddress[]> {
    return this.repository.find();
  }

  async create(data: Partial<FlaggedAddress>): Promise<FlaggedAddress> {
    const flagged = this.repository.create(data);
    return this.repository.save(flagged);
  }

  async delete(address: string, chain: Chain): Promise<void> {
    await this.repository.delete({ address, chain });
  }
}
