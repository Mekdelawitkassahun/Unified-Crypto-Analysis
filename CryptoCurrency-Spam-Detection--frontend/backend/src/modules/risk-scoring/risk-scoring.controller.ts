import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { RiskScoringService } from './risk-scoring.service';
import { RiskScoreDto } from '../addresses/dto/risk-score.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { Chain } from '../../shared/enums/chain.enum';

@ApiTags('Risk Scoring')
@ApiBearerAuth()
@Controller('api/v1/risk')
export class RiskScoringController {
  constructor(private readonly riskScoringService: RiskScoringService) {}

  @Get(':address')
  @ApiOperation({ summary: 'Calculate risk score for address' })
  @ApiParam({ name: 'address', description: 'Blockchain address' })
  @ApiQuery({ name: 'chain', enum: Chain, required: false })
  async calculateRisk(
    @Param('address') address: string,
    @Query('chain') chain: Chain = Chain.ETHEREUM,
  ): Promise<RiskScoreDto> {
    return this.riskScoringService.calculateRisk(address, chain);
  }
}
