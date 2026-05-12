import { IsString, IsNumberString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Chain } from '../../../shared/enums/chain.enum';

export class IngestTransactionDto {
  @ApiProperty()
  @IsString()
  txHash: string;

  @ApiProperty()
  @IsString()
  fromAddress: string;

  @ApiProperty()
  @IsString()
  toAddress: string;

  @ApiProperty()
  @IsNumberString()
  amount: string;

  @ApiProperty()
  @IsDateString()
  timestamp: string;

  @ApiProperty({ enum: Chain })
  @IsEnum(Chain)
  chain: Chain;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  blockNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  gasPrice?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  gasUsed?: string;
}
