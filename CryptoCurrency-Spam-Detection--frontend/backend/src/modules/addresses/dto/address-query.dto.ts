import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { Chain } from '../../../shared/enums/chain.enum';

export class AddressParamDto {
  @IsString()
  address: string;
}

export class ChainQueryDto {
  @IsOptional()
  @IsEnum(Chain)
  chain?: Chain = Chain.ETHEREUM;
}

export class PaginationQueryDto extends ChainQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 20;

  /** Passed by the UI date filter; ignored by the server until indexed filtering exists */
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

export class DepthQueryDto extends ChainQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  depth?: number = 2;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  minAmount?: number;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

export class RangeQueryDto extends ChainQueryDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  range?: string = '30d';

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
