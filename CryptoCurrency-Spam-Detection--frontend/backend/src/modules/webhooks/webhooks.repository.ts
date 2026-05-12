import { Injectable } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { Webhook } from './entities/webhook.entity';

@Injectable()
export class WebhooksRepository {
  private repository: Repository<Webhook>;

  constructor(private dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(Webhook);
  }

  async create(data: Partial<Webhook>): Promise<Webhook> {
    const webhook = this.repository.create(data);
    return this.repository.save(webhook);
  }

  async findAll(): Promise<Webhook[]> {
    return this.repository.find({ order: { createdAt: 'DESC' } });
  }

  async findActiveByEvent(event: string): Promise<Webhook[]> {
    return this.repository
      .createQueryBuilder('webhook')
      .where('webhook.isActive = :isActive', { isActive: true })
      .andWhere(':event = ANY(webhook.events)', { event })
      .getMany();
  }

  async findById(id: string): Promise<Webhook | null> {
    const result = await this.repository.findOne({ where: { id } });
    return result ?? null;
  }

  async update(id: string, data: Partial<Webhook>): Promise<void> {
    await this.repository.update(id, data);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
