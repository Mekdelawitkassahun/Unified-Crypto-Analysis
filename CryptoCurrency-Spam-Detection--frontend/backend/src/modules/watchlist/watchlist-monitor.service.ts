import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Watchlist } from './entities/watchlist.entity';
import { AlertEntity } from '../alerts/alert.entity';
import { AlertsGateway } from '../alerts/alerts.gateway';
import { RiskScoringService } from '../risk-scoring/risk-scoring.service';
import { FlaggedAddressesService } from '../flagged-addresses/flagged-addresses.service';
import { Chain } from '../../shared/enums/chain.enum';

/**
 * WatchlistMonitorService
 *
 * Runs a background polling loop every 5 minutes.
 * For each watchlist item with alerts_enabled=true it:
 *   1. Recomputes the risk score
 *   2. Checks if the address is newly flagged
 *   3. Emits a WebSocket alert if risk increased significantly or address became flagged
 */
@Injectable()
export class WatchlistMonitorService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(WatchlistMonitorService.name);
    private intervalHandle: NodeJS.Timeout | null = null;
    private readonly POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
    private readonly RISK_INCREASE_THRESHOLD = 15; // alert if risk goes up by this much

    // Track last known risk scores to detect increases
    private readonly lastRiskScores = new Map<string, number>();

    constructor(
        @InjectRepository(Watchlist)
        private readonly watchlistRepo: Repository<Watchlist>,
        @InjectRepository(AlertEntity)
        private readonly alertsRepo: Repository<AlertEntity>,
        private readonly alertsGateway: AlertsGateway,
        private readonly riskScoringService: RiskScoringService,
        private readonly flaggedService: FlaggedAddressesService,
    ) { }

    onModuleInit() {
        // Delay first run by 30s to let the app fully start
        setTimeout(() => {
            this.runMonitorCycle().catch((err) =>
                this.logger.error(`Initial monitor cycle failed: ${err.message}`),
            );
            this.intervalHandle = setInterval(() => {
                this.runMonitorCycle().catch((err) =>
                    this.logger.error(`Monitor cycle failed: ${err.message}`),
                );
            }, this.POLL_INTERVAL_MS);
        }, 30_000);
    }

    onModuleDestroy() {
        if (this.intervalHandle) {
            clearInterval(this.intervalHandle);
            this.intervalHandle = null;
        }
    }

    async runMonitorCycle(): Promise<void> {
        let items: Watchlist[] = [];
        try {
            items = await this.watchlistRepo.find({ where: { alerts_enabled: true } });
        } catch (err) {
            this.logger.warn(`Failed to load watchlist: ${(err as Error).message}`);
            return;
        }

        if (items.length === 0) return;

        this.logger.log(`Monitoring ${items.length} watchlist addresses…`);

        // Process in batches of 5 to avoid hammering RPCs
        const batchSize = 5;
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            await Promise.allSettled(batch.map((item) => this.checkItem(item)));
            // Small delay between batches
            if (i + batchSize < items.length) {
                await new Promise((r) => setTimeout(r, 2000));
            }
        }
    }

    private async checkItem(item: Watchlist): Promise<void> {
        const key = `${item.address}:${item.chain}`;
        try {
            const chain = item.chain as Chain;

            const [risk, flagged] = await Promise.all([
                this.riskScoringService.getOrComputeRisk(item.address, chain, 30), // 30min cache — avoids hammering engine
                this.flaggedService.checkFlagged(item.address, chain),
            ]);

            const prevScore = this.lastRiskScores.get(key) ?? risk.score;
            const scoreDelta = risk.score - prevScore;
            this.lastRiskScores.set(key, risk.score);

            // Alert on significant risk increase
            if (scoreDelta >= this.RISK_INCREASE_THRESHOLD) {
                await this.emitAlert({
                    address: item.address,
                    chain: item.chain,
                    type: 'risk_increase',
                    message: `Risk score increased by ${scoreDelta} points (now ${risk.score}/100) for ${item.address.slice(0, 10)}…`,
                });
            }

            // Alert if newly flagged
            if (flagged.isFlagged) {
                const existingFlagAlert = await this.alertsRepo.findOne({
                    where: { address: item.address, chain: item.chain, type: 'flagged_interaction' },
                    order: { createdAt: 'DESC' },
                });
                const recentThreshold = Date.now() - 24 * 60 * 60 * 1000; // 24h
                const isRecent = existingFlagAlert
                    ? new Date(existingFlagAlert.createdAt).getTime() > recentThreshold
                    : false;

                if (!isRecent) {
                    await this.emitAlert({
                        address: item.address,
                        chain: item.chain,
                        type: 'flagged_interaction',
                        message: `Address ${item.address.slice(0, 10)}… matched flagged database: ${flagged.reasons.slice(0, 2).join(', ')}`,
                    });
                }
            }
        } catch (err) {
            this.logger.warn(`Monitor check failed for ${key}: ${(err as Error).message}`);
        }
    }

    private async emitAlert(data: {
        address: string;
        chain: string;
        type: string;
        message: string;
    }): Promise<void> {
        try {
            const alert = this.alertsRepo.create({
                address: data.address,
                chain: data.chain,
                type: data.type as any,
                message: data.message,
                read: false,
            });
            const saved = await this.alertsRepo.save(alert);
            this.alertsGateway.sendAlert(saved);
            this.logger.log(`Alert emitted: ${data.type} for ${data.address}`);
        } catch (err) {
            this.logger.warn(`Failed to emit alert: ${(err as Error).message}`);
        }
    }
}
