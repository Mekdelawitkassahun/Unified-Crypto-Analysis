import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Chain } from '../../../shared/enums/chain.enum';

export class GenerateReportDto {
  @ApiProperty()
  @IsString()
  address: string;

  @ApiProperty({ enum: Chain })
  @IsEnum(Chain)
  chain: Chain;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string;
}
