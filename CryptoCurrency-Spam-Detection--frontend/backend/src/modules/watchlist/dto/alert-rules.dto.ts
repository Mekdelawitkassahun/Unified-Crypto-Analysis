import { IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AlertRulesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  flaggedInteraction?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  velocityThreshold?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyOnNewTx?: boolean;
}
