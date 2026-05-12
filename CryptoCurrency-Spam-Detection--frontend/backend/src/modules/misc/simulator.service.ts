import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { FlaggedAddressesService } from '../flagged-addresses/flagged-addresses.service';
import { RiskScoringService } from '../risk-scoring/risk-scoring.service';
import { Chain } from '../../shared/enums/chain.enum';

export interface SimulationResult {
    success: boolean;
    from: string;
    to: string;
    amount: number;
    chain: string;
    gasEstimate?: number;
    gasCostEth?: number;
    riskFlags: string[];
    toRiskScore: number;
    fromRiskScore: number;
    recommendation: 'safe' | 'caution' | 'block';
    details: string;
    simulatedAt: string;
}

@Injectable()
export class SimulatorService {
    private readonly logger = new Logger(SimulatorService.name);

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
        sepolia: 'https://ethereum-sepolia-rpc.publicnode.com',
    };

    constructor(
        private readonly configService: ConfigService,
        private readonly flaggedService: FlaggedAddressesService,
        private readonly riskScoringService: RiskScoringService,
    ) { }

    async simulate(payload: {
        from: string;
        to: string;
        amount: number;
        chain: string;
        data?: string;
    }): Promise<SimulationResult> {
        const chain = (payload.chain ?? 'ethereum') as Chain;
        const rpcUrl = this.chainRpcs[chain] ?? this.chainRpcs['ethereum'];

        const riskFlags: string[] = [];

        // Parallel: check flagged status + risk scores + gas estimate
        const [fromFlagged, toFlagged, fromRisk, toRisk, gasEstimate] = await Promise.allSettled([
            this.flaggedService.checkFlagged(payload.from, chain),
            this.flaggedService.checkFlagged(payload.to, chain),
            this.riskScoringService.getOrComputeRisk(payload.from, chain),
            this.riskScoringService.getOrComputeRisk(payload.to, chain),
            this.estimateGas(rpcUrl, payload.from, payload.to, payload.amount, payload.data),
        ]);

        const fromFlaggedResult = fromFlagged.status === 'fulfilled' ? fromFlagged.value : { isFlagged: false, reasons: [] };
        const toFlaggedResult = toFlagged.status === 'fulfilled' ? toFlagged.value : { isFlagged: false, reasons: [] };
        const fromRiskResult = fromRisk.status === 'fulfilled' ? fromRisk.value : { score: 0, factors: [], level: 'LOW', recommendation: '' };
        const toRiskResult = toRisk.status === 'fulfilled' ? toRisk.value : { score: 0, factors: [], level: 'LOW', recommendation: '' };
        const gasEst = gasEstimate.status === 'fulfilled' ? gasEstimate.value : null;

        if (fromFlaggedResult.isFlagged) {
            riskFlags.push(`Sender flagged: ${fromFlaggedResult.reasons.join(', ')}`);
        }
        if (toFlaggedResult.isFlagged) {
            riskFlags.push(`Recipient flagged: ${toFlaggedResult.reasons.join(', ')}`);
        }
        if (fromRiskResult.score >= 60) {
            riskFlags.push(`Sender high risk score: ${fromRiskResult.score}/100`);
        }
        if (toRiskResult.score >= 60) {
            riskFlags.push(`Recipient high risk score: ${toRiskResult.score}/100`);
        }
        if (toRiskResult.score >= 30 && toRiskResult.score < 60) {
            riskFlags.push(`Recipient suspicious score: ${toRiskResult.score}/100`);
        }

        // Determine recommendation
        const maxRisk = Math.max(fromRiskResult.score, toRiskResult.score);
        const anyFlagged = fromFlaggedResult.isFlagged || toFlaggedResult.isFlagged;

        let recommendation: 'safe' | 'caution' | 'block';
        let details: string;

        if (anyFlagged || maxRisk >= 70) {
            recommendation = 'block';
            details = anyFlagged
                ? 'Transaction involves a flagged address. Strongly advised to abort.'
                : `High risk detected (score ${maxRisk}/100). Transaction not recommended.`;
        } else if (maxRisk >= 30) {
            recommendation = 'caution';
            details = `Suspicious activity detected (score ${maxRisk}/100). Proceed with caution.`;
        } else {
            recommendation = 'safe';
            details = 'No significant risk factors detected. Transaction appears safe.';
        }

        // Gas cost in ETH (rough estimate: gasEstimate * 20 gwei)
        const gasCostEth = gasEst ? (gasEst * 20e9) / 1e18 : undefined;

        return {
            success: true,
            from: payload.from,
            to: payload.to,
            amount: payload.amount,
            chain: payload.chain,
            gasEstimate: gasEst ?? undefined,
            gasCostEth,
            riskFlags,
            toRiskScore: toRiskResult.score,
            fromRiskScore: fromRiskResult.score,
            recommendation,
            details,
            simulatedAt: new Date().toISOString(),
        };
    }

    private async estimateGas(
        rpcUrl: string,
        from: string,
        to: string,
        amount: number,
        data?: string,
    ): Promise<number | null> {
        try {
            const valueHex = '0x' + Math.floor(amount * 1e18).toString(16);
            const response = await axios.post(
                rpcUrl,
                {
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'eth_estimateGas',
                    params: [
                        {
                            from,
                            to,
                            value: valueHex,
                            data: data ?? '0x',
                        },
                    ],
                },
                { timeout: 5000 },
            );
            const hex = response.data?.result;
            return hex ? parseInt(hex, 16) : null;
        } catch {
            return 21000; // Default ETH transfer gas
        }
    }
}
