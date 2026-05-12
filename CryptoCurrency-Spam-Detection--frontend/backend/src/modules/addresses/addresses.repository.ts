import { Injectable } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { Address } from './entities/address.entity';
import { Chain } from '../../shared/enums/chain.enum';
import { AddressValidator } from '../../shared/utils/address-validator.util';

@Injectable()
export class AddressesRepository {
  private repository: Repository<Address>;

  constructor(private dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(Address);
  }

  async findByAddressAndChain(address: string, chain: Chain): Promise<Address | null> {
    if (AddressValidator.isValidEthereumAddress(address)) {
      const result = await this.repository
        .createQueryBuilder('a')
        .where('a.chain = :chain', { chain })
        .andWhere('LOWER(a.address) = LOWER(:address)', { address })
        .getOne();
      return result ?? null;
    }
    const result = await this.repository.findOne({
      where: { address, chain },
    });
    return result ?? null;
  }

  async findAcrossChains(address: string): Promise<Address[]> {
    return this.repository.find({
      where: { address },
      order: { updatedAt: 'DESC' },
    });
  }

  async create(data: Partial<Address>): Promise<Address> {
    const address = this.repository.create(data);
    return this.repository.save(address);
  }

  async save(address: Address): Promise<Address> {
    return this.repository.save(address);
  }

  async updateTotals(
    address: string,
    chain: Chain,
    amount: number,
    isSender: boolean,
  ): Promise<void> {
    const addr = await this.findByAddressAndChain(address, chain);
    if (!addr) return;

    const currentBalance = addr.balance;
    const currentReceived = addr.totalReceived;
    const currentSent = addr.totalSent;
    const txAmount = amount;

    if (isSender) {
      addr.balance = currentBalance - txAmount;
      addr.totalSent = currentSent + txAmount;
    } else {
      addr.balance = currentBalance + txAmount;
      addr.totalReceived = currentReceived + txAmount;
    }

    await this.save(addr);
  }

  async incrementTxCount(address: string, chain: Chain): Promise<void> {
    await this.repository.increment(
      { address, chain },
      'txCount',
      1,
    );
  }

  async findByRiskScore(minScore: number, maxScore: number): Promise<Address[]> {
    return this.repository
      .createQueryBuilder('address')
      .where('address.riskScore >= :minScore', { minScore })
      .andWhere('address.riskScore <= :maxScore', { maxScore })
      .getMany();
  }
}
