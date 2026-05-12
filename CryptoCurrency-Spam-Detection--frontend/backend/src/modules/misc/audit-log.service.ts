import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async log(input: {
    actor?: string;
    action: string;
    resource: string;
    meta?: Record<string, unknown>;
  }): Promise<void> {
    const entry = this.auditRepo.create({
      actor: (input.actor ?? 'system').slice(0, 120),
      action: input.action.slice(0, 120),
      resource: input.resource.slice(0, 255),
      meta: input.meta ?? {},
    });
    await this.auditRepo.save(entry);
  }

  async list(params: {
    limit?: number;
    offset?: number;
    actor?: string;
    action?: string;
  }) {
    const take = Math.min(Math.max(Number(params.limit ?? 100), 1), 500);
    const skip = Math.max(Number(params.offset ?? 0), 0);

    const qb = this.auditRepo.createQueryBuilder('audit');
    if (params.actor) {
      qb.andWhere('audit.actor ILIKE :actor', { actor: `%${params.actor}%` });
    }
    if (params.action) {
      qb.andWhere('audit.action ILIKE :action', { action: `%${params.action}%` });
    }

    const [items, total] = await qb
      .orderBy('audit.createdAt', 'DESC')
      .skip(skip)
      .take(take)
      .getManyAndCount();

    return { items, total, limit: take, offset: skip };
  }
}
