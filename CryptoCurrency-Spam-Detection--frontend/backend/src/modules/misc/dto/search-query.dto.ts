import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Chain } from '../../../shared/enums/chain.enum';

export class SearchQueryDto {
  @IsString()
  @MinLength(2)
  q: string;

  @IsOptional()
  @IsEnum(Chain)
  chain?: Chain;
}
