import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { FlaggedAddressesService } from '../flagged-addresses/flagged-addresses.service';
import { TransactionsService } from '../transactions/transactions.service';
import { AddressRelationshipsService } from '../address-relationships/address-relationships.service';
import { RiskScoreDto, RiskFactorDto } from '../addresses/dto/risk-score.dto';
import { Chain } from '../../shared/enums/chain.enum';
import { RiskCalculator } from '../../shared/utils/risk-calculator.util';
import { RiskAssessment } from './entities/risk-assessment.entity';
import { Address } from '../addresses/entities/address.entity';
import { getBlockchainEngineTimeoutMs } from '../../shared/utils/blockchain-engine-timeout.util';

@Injectable()
export class RiskScoringService {
  private readonly logger = new Logger(RiskScoringService.name);
  private readonly blockchainApiUrl: string;
  private readonly engineTimeoutMs: number;

  constructor(
    private readonly flaggedAddressesService: FlaggedAddressesService,
    private readonly transactionsService: TransactionsService,
    private readonly addressRelationshipsService: AddressRelationshipsService,
    private readonly configService: ConfigService,
    @InjectRepository(RiskAssessment)
    private readonly riskAssessmentRepo: Repository<RiskAssessment>,
    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,
  ) {
    this.blockchainApiUrl = this.configService.get<string>('BLOCKCHAIN_API_URL', 'http://127.0.0.1:8055');
    this.engineTimeoutMs = getBlockchainEngineTimeoutMs(this.configService);
  }
  private isEngineSupportedChain(chain: Chain): boolean {
    return chain !== Chain.SEPOLIA;
  }

  async getOrComputeRisk(address: string, chain: Chain, maxAgeMinutes = 15): Promise<RiskScoreDto> {
    const latest = await this.riskAssessmentRepo.findOne({
      where: { address, chain },
      order: { createdAt: 'DESC' },
    });
    if (latest) {
      const ageMs = Date.now() - new Date(latest.createdAt).getTime();
      if (ageMs <= maxAgeMinutes * 60 * 1000) {
        return {
          score: Number(latest.score),
          level: latest.level,
          recommendation: latest.recommendation ?? '',
          factors: (latest.factors ?? []).map((f) => ({
            factor: f.factor,
            points: f.points,
            description: f.description,
          })),
        };
      }
    }
    return this.calculateRisk(address, chain);
  }

  async calculateRisk(address: string, chain: Chain): Promise<RiskScoreDto> {
    try {
      // Try to get risk score from the blockchain engine
      try {
        if (!this.isEngineSupportedChain(chain)) {
          throw new Error('ENGINE_SKIPPED_FOR_CHAIN');
        }
        const response = await axios.get(`${this.blockchainApiUrl}/risk`, {
          params: { address, chain: chain.toLowerCase(), limit: 50 },
          timeout: this.engineTimeoutMs,
        });

        if (response.data && response.data.score !== undefined) {
          const engineScore = response.data.score;
          const factors: RiskFactorDto[] = (response.data.detections || []).map((d: any) => ({
            factor: d.label,
            points: d.severity === 'high' ? 40 : d.severity === 'medium' ? 20 : 10,
            description: d.details?.description || `Detected ${d.label} behavior`,
          }));

          const finalScore = RiskCalculator.capScore(engineScore);
          const level = RiskCalculator.calculateLevel(finalScore);
          const recommendation = RiskCalculator.getRecommendation(finalScore);

          const result: RiskScoreDto = {
            score: finalScore,
            factors,
            recommendation,
            level,
          };

          // Save assessment to DB for history/caching
          await this.riskAssessmentRepo.save({
            address,
            chain,
            score: finalScore,
            level,
            recommendation,
            factors: factors.map((f) => ({
              factor: f.factor,
              points: f.points,
              description: f.description,
            })),
          });

          // Update address entity
          await this.addressRepo.update(
            { address, chain },
            { riskScore: finalScore, lastChecked: new Date() },
          );

          return result;
        }
      } catch (error) {
        const message = (error as Error).message;
        if (message === 'ENGINE_SKIPPED_FOR_CHAIN') {
          this.logger.warn(`Risk engine skipped for chain ${chain}; using local risk calculator.`);
        } else {
          this.logger.warn(`Failed to fetch risk from blockchain engine: ${message}. Falling back to local calculator.`);
        }
      }

      // Fallback to local calculation if blockchain engine is unavailable
      const factors: RiskFactorDto[] = [];
      let score = 0;

      // 1. Directly flagged (+60)
      const isDirectlyFlagged = await this.flaggedAddressesService.isDirectlyFlagged(address, chain).catch(() => false);
      if (isDirectlyFlagged) {
        score += 60;
        factors.push({
          factor: 'directly_flagged',
          points: 60,
          description: 'Address is directly flagged in our database for suspicious activity',
        });
      }

      // 2. 1 hop from flagged (+40)
      try {
        const oneHopFlagged = await this.addressRelationshipsService.findNeighbors(address, chain, 1).catch(() => []);
        for (const neighbor of oneHopFlagged) {
          const flagged = await this.flaggedAddressesService.isDirectlyFlagged(neighbor, chain).catch(() => false);
          if (flagged) {
            score += 40;
            factors.push({
              factor: 'one_hop_from_flagged',
              points: 40,
              description: `Interacted with flagged address: ${neighbor.substring(0, 10)}...`,
            });
            break; // Only count once
          }
        }
      } catch (e) { }

      // 3. 2 hops from flagged (+20)
      try {
        const twoHopFlagged = await this.addressRelationshipsService.findNeighbors(address, chain, 2).catch(() => []);
        for (const neighbor of twoHopFlagged) {
          const flagged = await this.flaggedAddressesService.isDirectlyFlagged(neighbor, chain).catch(() => false);
          if (flagged) {
            score += 20;
            factors.push({
              factor: 'two_hops_from_flagged',
              points: 20,
              description: `Two hops away from flagged address: ${neighbor.substring(0, 10)}...`,
            });
            break;
          }
        }
      } catch (e) { }

      // 4. Mixer interaction (+35)
      try {
        const hasMixerInteraction = await this.hasCategoryInteraction(
          address,
          chain,
          /mixer|tornado|launder/i,
          90,
        ).catch(() => false);
        if (hasMixerInteraction) {
          score += 35;
          factors.push({
            factor: 'mixer_interaction',
            points: 35,
            description: 'Address has interacted with a mixer/laundering-labeled address',
          });
        }
      } catch (e) { }

      // 5. Exchange deposit (+10)
      try {
        const hasExchangeDeposit = await this.checkExchangeDeposit(address, chain).catch(() => false);
        if (hasExchangeDeposit) {
          score += 10;
          factors.push({
            factor: 'exchange_deposit',
            points: 10,
            description: 'Address has deposited to known exchange',
          });
        }
      } catch (e) { }

      // 6. Darknet interaction (+50)
      try {
        const hasDarknetInteraction = await this.hasCategoryInteraction(
          address,
          chain,
          /darknet|market/i,
          90,
        ).catch(() => false);
        if (hasDarknetInteraction) {
          score += 50;
          factors.push({
            factor: 'darknet_interaction',
            points: 50,
            description: 'Address has interacted with darknet marketplace',
          });
        }
      } catch (e) { }

      // 7. Velocity > 100 ETH/day (+15)
      try {
        const velocity = await this.transactionsService.calculateVelocity(address, chain, 24).catch(() => 0);
        if (velocity > 100) {
          score += 15;
          factors.push({
            factor: 'high_velocity',
            points: 15,
            description: `High transaction velocity: ${velocity.toFixed(2)} ETH in last 24h`,
          });
        }
      } catch (e) { }

      // 8. New address (<7 days) with high volume (+10)
      try {
        const isNewWithHighVolume = await this.checkNewAddressHighVolume(address, chain).catch(() => false);
        if (isNewWithHighVolume) {
          score += 10;
          factors.push({
            factor: 'new_address_high_volume',
            points: 10,
            description: 'New address with unusually high transaction volume',
          });
        }
      } catch (e) { }

      const finalScore = RiskCalculator.capScore(score);
      const level = RiskCalculator.calculateLevel(finalScore);
      const recommendation = RiskCalculator.getRecommendation(finalScore);

      const result: RiskScoreDto = {
        score: finalScore,
        factors,
        recommendation,
        level,
      };

      try {
        await this.riskAssessmentRepo.save({
          address,
          chain,
          score: finalScore,
          level,
          recommendation,
          factors: factors.map((f) => ({
            factor: f.factor,
            points: f.points,
            description: f.description,
          })),
        });

        await this.addressRepo.update(
          { address, chain },
          { riskScore: finalScore, lastChecked: new Date() },
        );
      } catch (dbError) {
        this.logger.error(`Failed to save fallback risk assessment to DB: ${(dbError as Error).message}`);
      }

      return result;
    } catch (criticalError) {
      this.logger.error(`Critical error in calculateRisk: ${(criticalError as Error).message}`);
      return {
        score: 0,
        factors: [],
        level: 'LOW',
        recommendation: 'Risk calculation failed. Please try again later.',
      };
    }
  }

  private async hasCategoryInteraction(
    address: string,
    chain: Chain,
    categoryPattern: RegExp,
    lookbackHours: number,
  ): Promise<boolean> {
    const recentTxs = await this.transactionsService.getRecentTransactions(address, chain, lookbackHours);
    if (recentTxs.length === 0) return false;
    const flagged = await this.flaggedAddressesService.findAll(chain);
    const categorySet = new Set(
      flagged
        .filter((f) => categoryPattern.test((f.reason ?? '').toLowerCase()))
        .map((f) => f.address.toLowerCase()),
    );
    if (categorySet.size === 0) return false;
    return recentTxs.some(
      (tx) =>
        categorySet.has(tx.toAddress.toLowerCase()) ||
        categorySet.has(tx.fromAddress.toLowerCase()),
    );
  }

  private async checkExchangeDeposit(address: string, chain: Chain): Promise<boolean> {
    const recentTxs = await this.transactionsService.getRecentTransactions(address, chain, 30);
    const flagged = await this.flaggedAddressesService.findAll(chain);
    const exchangeSet = new Set(
      flagged
        .filter((f) => /exchange|cex|binance|coinbase|kraken/i.test((f.reason ?? '').toLowerCase()))
        .map((f) => f.address.toLowerCase()),
    );
    if (exchangeSet.size === 0) return false;
    return recentTxs.some(
      (tx) =>
        tx.fromAddress.toLowerCase() === address.toLowerCase() &&
        exchangeSet.has(tx.toAddress.toLowerCase()),
    );
  }

  private async checkNewAddressHighVolume(address: string, chain: Chain): Promise<boolean> {
    const allTxs = await this.transactionsService.findByAddress(address, chain, 1000, 0);
    if (allTxs.data.length < 5) return false;

    const firstTx = allTxs.data[allTxs.data.length - 1];
    const addressAge = Date.now() - new Date(firstTx.timestamp).getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    if (addressAge < sevenDays) {
      const totalVolume = allTxs.data.reduce((sum, tx) => sum + tx.amount, 0);
      return totalVolume > 50; // 50 ETH threshold for new address
    }

    return false;
  }
}
