import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey, ApiKeyPermission, ApiKeyTier } from './entities/api-key.entity';
import { ApiUsage } from './entities/api-usage.entity';
import * as crypto from 'crypto';

@Injectable()
export class OrganizationService {
    constructor(
        @InjectRepository(ApiKey)
        private readonly apiKeyRepo: Repository<ApiKey>,
        @InjectRepository(ApiUsage)
        private readonly apiUsageRepo: Repository<ApiUsage>,
    ) { }

    private generateKey(): string {
        return 'csk_' + crypto.randomBytes(24).toString('hex');
    }

    async listKeys(userId?: string): Promise<ApiKey[]> {
        try {
            const where = userId ? { userId } : {};
            return await this.apiKeyRepo.find({
                where,
                order: { createdAt: 'DESC' },
            });
        } catch {
            return [];
        }
    }

    async createKey(payload: {
        name: string;
        permissions?: ApiKeyPermission;
        tier?: ApiKeyTier;
        expiresAt?: string;
        userId?: string;
    }): Promise<ApiKey> {
        const key = this.apiKeyRepo.create({
            name: payload.name,
            key: this.generateKey(),
            permissions: payload.permissions ?? 'read',
            tier: payload.tier ?? 'free',
            expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : undefined,
            userId: payload.userId,
            isActive: true,
            callCount: 0,
        });
        return this.apiKeyRepo.save(key);
    }

    async revokeKey(id: string): Promise<void> {
        const key = await this.apiKeyRepo.findOne({ where: { id } });
        if (!key) throw new NotFoundException('API key not found');
        key.isActive = false;
        await this.apiKeyRepo.save(key);
    }

    async deleteKey(id: string): Promise<void> {
        await this.apiKeyRepo.delete(id);
    }

    async recordUsage(keyId: string): Promise<void> {
        const today = new Date().toISOString().slice(0, 10);
        try {
            const existing = await this.apiUsageRepo.findOne({ where: { keyId, day: today } });
            if (existing) {
                existing.calls += 1;
                await this.apiUsageRepo.save(existing);
            } else {
                await this.apiUsageRepo.save(this.apiUsageRepo.create({ keyId, day: today, calls: 1 }));
            }
            // Update lastUsedAt on the key
            await this.apiKeyRepo.update(keyId, { lastUsedAt: new Date(), callCount: () => '"callCount" + 1' } as any);
        } catch {
            // Non-critical — don't fail the request
        }
    }

    async getUsageStats(userId?: string): Promise<Array<{ day: string; calls: number }>> {
        try {
            const keys = await this.listKeys(userId);
            if (keys.length === 0) return this.generateEmptyUsage();

            const keyIds = keys.map((k) => k.id);
            const rows = await this.apiUsageRepo
                .createQueryBuilder('u')
                .select('u.day', 'day')
                .addSelect('SUM(u.calls)', 'calls')
                .where('u."keyId" IN (:...keyIds)', { keyIds })
                .andWhere("u.day >= :since", { since: this.daysAgo(30) })
                .groupBy('u.day')
                .orderBy('u.day', 'ASC')
                .getRawMany();

            return rows.map((r) => ({ day: r.day, calls: Number(r.calls) }));
        } catch {
            return this.generateEmptyUsage();
        }
    }

    private daysAgo(n: number): string {
        const d = new Date();
        d.setDate(d.getDate() - n);
        return d.toISOString().slice(0, 10);
    }

    private generateEmptyUsage(): Array<{ day: string; calls: number }> {
        const result = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            result.push({ day: d.toISOString().slice(0, 10), calls: 0 });
        }
        return result;
    }

    async getRateLimitWarning(userId?: string): Promise<string | null> {
        try {
            const keys = await this.listKeys(userId);
            const freeKeys = keys.filter((k) => k.tier === 'free' && k.isActive);
            if (freeKeys.length === 0) return null;

            const today = new Date().toISOString().slice(0, 10);
            const keyIds = freeKeys.map((k) => k.id);
            const rows = await this.apiUsageRepo
                .createQueryBuilder('u')
                .select('SUM(u.calls)', 'total')
                .where('u."keyId" IN (:...keyIds)', { keyIds })
                .andWhere('u.day = :today', { today })
                .getRawOne();

            const total = Number(rows?.total ?? 0);
            if (total >= 900) return `Free tier limit approaching: ${total}/1000 calls today`;
            if (total >= 1000) return `Free tier daily limit reached (${total} calls). Upgrade to Pro for unlimited access.`;
            return null;
        } catch {
            return null;
        }
    }
}
