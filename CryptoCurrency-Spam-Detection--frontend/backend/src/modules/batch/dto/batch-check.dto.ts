import { IsArray, IsString, IsEnum, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Chain } from '../../../shared/enums/chain.enum';

export class BatchCheckDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  addresses: string[];

  @ApiProperty({ enum: Chain })
  @IsEnum(Chain)
  chain: Chain;
}
