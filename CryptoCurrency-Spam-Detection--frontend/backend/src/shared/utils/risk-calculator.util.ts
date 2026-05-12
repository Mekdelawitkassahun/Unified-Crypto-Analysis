import { RiskLevel } from '../enums/risk-level.enum';

export interface RiskFactor {
  factor: string;
  points: number;
  description: string;
}

export class RiskCalculator {
  static readonly RISK_THRESHOLDS = {
    [RiskLevel.LOW]: 0,
    [RiskLevel.MEDIUM]: 30,
    [RiskLevel.HIGH]: 60,
    [RiskLevel.CRITICAL]: 80,
  };

  static calculateLevel(score: number): RiskLevel {
    if (score >= 80) return RiskLevel.CRITICAL;
    if (score >= 60) return RiskLevel.HIGH;
    if (score >= 30) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  static getRecommendation(score: number): string {
    if (score >= 80) return 'Immediate investigation required. High probability of illicit activity.';
    if (score >= 60) return 'Proceed with caution. Multiple risk factors detected.';
    if (score >= 30) return 'Moderate risk. Verify transaction history before proceeding.';
    return 'Low risk profile. Standard due diligence recommended.';
  }

  static capScore(score: number): number {
    return Math.min(Math.max(score, 0), 100);
  }
}
