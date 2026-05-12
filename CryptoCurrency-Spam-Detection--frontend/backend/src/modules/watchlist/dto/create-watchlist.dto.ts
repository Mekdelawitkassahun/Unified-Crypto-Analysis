import { IsString, IsOptional, IsObject, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Chain } from '../../../shared/enums/chain.enum';

export class CreateWatchlistDto {
  @ApiProperty()
  @IsString()
  address: string;

  @ApiProperty({ enum: Chain })
  @IsEnum(Chain)
  chain: Chain;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  alertRules?: {
    minAmount?: number;
    flaggedInteraction?: boolean;
    velocityThreshold?: number;
    notifyOnNewTx?: boolean;
  };
}