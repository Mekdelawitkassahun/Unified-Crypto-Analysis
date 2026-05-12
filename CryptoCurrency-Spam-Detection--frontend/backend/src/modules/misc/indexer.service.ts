import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../transactions/entities/transaction.entity';

export interface ChainStatus {
    chain: string;
    currentBlock: number;
    lastIndexedBlock: number;
    behind: number;
    healthy: boolean;
    latencyMs?: number;
}

export interface PerformancePoint {
    ts: string;
    blocksPerMinute: number;
    avgLatencyMs: number;
    queueDepth: number;
}

@Injectable()
export class IndexerService {
    private readonly logger = new Logger(IndexerService.name);
    private readonly perfHistory: PerformancePoint[] = [];
    private readonly maxPerfHistory = 60;

    // Public RPC endpoints for block number probing
    private readonly chainRpcs: Record<string, string> = {
        ethereum: 'https://ethereum-rpc.publicnode.com',
        polygon: 'https://polygon-rpc.com',
        bsc: 'https://bsc-dataseed.binance.org',
        arbitrum: 'https://arb1.arbitrum.io/rpc',
        optimism: 'https://mainnet.optimism.io',
        base: 'https://mainnet.base.org',
        avalanche: 'https://api.avax.network/ext/bc/C/rpc',
        fantom: 'https://rpc.fantom.network',
        gnosis: 'https://rpc.gnosischain.com',
        celo: 'https://forno.celo.org',
        cronos: 'https://evm.cronos.org',
        moonbeam: 'https://rpc.api.moonbeam.network',
        metis: 'https://andromeda.metis.io/?owner=1088',
        kava: 'https://evm.kava.io',
    };

    constructor(
        private readonly configService: ConfigService,
        @InjectRepository(Transaction)
        private readonly txRepo: Repository<Transaction>,
    ) {
        // Override with env-configured RPCs if available
        const envOverrides: Record<string, string> = {
            ethereum: configService.get('ETH_RPC_URL', ''),
            polygon: configService.get('POLYGON_RPC_URL', ''),
            bsc: configService.get('BSC_RPC_URL', ''),
            arbitrum: configService.get('ARBITRUM_RPC_URL', ''),
            optimism: configService.get('OPTIMISM_RPC_URL', ''),
            base: configService.get('BASE_RPC_URL', ''),
            avalanche: configService.get('AVALANCHE_RPC_URL', ''),
            fantom: configService.get('FANTOM_RPC_URL', ''),
            gnosis: configService.get('GNOSIS_RPC_URL', ''),
        };
        for (const [chain, url] of Object.entries(envOverrides)) {
            if (url) this.chainRpcs[chain] = url;
        }
    }

    async getChainStatus(): Promise<{ chains: ChainStatus[]; performance: PerformancePoint[] }> {
        const targetChains = ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base', 'avalanche', 'fantom', 'gnosis'];

        const results = await Promise.allSettled(
            targetChains.map((chain) => this.probeChain(chain)),
        );

        const chains: ChainStatus[] = results.map((r, i) => {
            if (r.status === 'fulfilled') return r.value;
            return {
                chain: targetChains[i],
                currentBlock: 0,
                lastIndexedBlock: 0,
                behind: 0,
                healthy: false,
                latencyMs: undefined,
            };
        });

        // Record a performance snapshot
        const avgLatency = chains
            .filter((c) => c.latencyMs !== undefined)
            .reduce((sum, c, _, arr) => sum + (c.latencyMs ?? 0) / arr.length, 0);

        const snap: PerformancePoint = {
            ts: new Date().toISOString(),
            blocksPerMinute: chains.filter((c) => c.healthy).length * 5, // rough estimate
            avgLatencyMs: Math.round(avgLatency),
            queueDepth: 0,
        };
        this.perfHistory.push(snap);
        if (this.perfHistory.length > this.maxPerfHistory) {
            this.perfHistory.shift();
        }

        return { chains, performance: [...this.perfHistory].slice(-20) };
    }

    private async probeChain(chain: string): Promise<ChainStatus> {
        const rpcUrl = this.chainRpcs[chain];
        if (!rpcUrl) {
            return { chain, currentBlock: 0, lastIndexedBlock: 0, behind: 0, healthy: false };
        }

        const start = Date.now();
        try {
            const response = await axios.post(
                rpcUrl,
                { jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] },
                { timeout: 5000 },
            );
            const latencyMs = Date.now() - start;
            const hex = response.data?.result;
            const currentBlock = hex ? parseInt(hex, 16) : 0;

            // Get last indexed block from our DB
            const lastTx = await this.txRepo
                .createQueryBuilder('tx')
                .select('MAX(tx.blockNumber)', 'maxBlock')
                .where('tx.chain = :chain', { chain })
                .getRawOne()
                .catch(() => null);

            const lastIndexedBlock = Number(lastTx?.maxBlock ?? 0);
            const behind = Math.max(0, currentBlock - lastIndexedBlock);

            return {
                chain,
                currentBlock,
                lastIndexedBlock,
                behind,
                healthy: latencyMs < 4000 && currentBlock > 0,
                latencyMs,
            };
        } catch {
            return {
                chain,
                currentBlock: 0,
                lastIndexedBlock: 0,
                behind: 0,
                healthy: false,
                latencyMs: Date.now() - start,
            };
        }
    }

    async triggerReindex(address: string, blockRange?: string): Promise<{ queued: boolean; message: string }> {
        // In a full implementation this would enqueue a Bull job to re-scan the address.
        // For now we return a queued acknowledgement.
        this.logger.log(`Reindex requested for ${address} range=${blockRange ?? 'latest'}`);
        return {
            queued: true,
            message: `Reindex queued for ${address}${blockRange ? ` (blocks ${blockRange})` : ''}`,
        };
    }
}
