import { Injectable } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { Watchlist } from './entities/watchlist.entity';
import { Chain } from '../../shared/enums/chain.enum';

@Injectable()
export class WatchlistRepository {
  private repository: Repository<Watchlist>;

  constructor(private dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(Watchlist);
  }

  async findByAddressAndChain(address: string, chain: Chain): Promise<Watchlist | null> {
    const result = await this.repository.findOne({
      where: { address, chain },
    });
    return result ?? null;
  }

  async findByUserId(userId: string): Promise<Watchlist[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(): Promise<Watchlist[]> {
    return this.repository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findAllWithAlertRules(): Promise<Watchlist[]> {
    return this.repository
      .createQueryBuilder('watchlist')
      .where('watchlist.alertRules IS NOT NULL')
      .getMany();
  }

  async create(data: Partial<Watchlist>): Promise<Watchlist> {
    const watchlist = this.repository.create(data);
    return this.repository.save(watchlist);
  }

  async delete(address: string, chain: Chain): Promise<void> {
    await this.repository.delete({ address, chain });
  }

  async updateAlertRules(id: string, rules: any): Promise<void> {
    await this.repository.update(id, { alertRules: rules });
  }
}
