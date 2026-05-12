import { ApiProperty } from '@nestjs/swagger';

export class RiskFactorDto {
  @ApiProperty()
  factor: string;

  @ApiProperty()
  points: number;

  @ApiProperty()
  description: string;
}

export class RiskScoreDto {
  @ApiProperty()
  score: number;

  @ApiProperty({ type: [RiskFactorDto] })
  factors: RiskFactorDto[];

  @ApiProperty()
  recommendation: string;

  @ApiProperty()
  level: string;
}
