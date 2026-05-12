import { ApiProperty } from '@nestjs/swagger';

export class AlertPayloadDto {
  @ApiProperty()
  event: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  relatedFlagged: string;

  @ApiProperty()
  txHash: string;

  @ApiProperty()
  amount: string;

  @ApiProperty()
  timestamp: string;

  @ApiProperty()
  chain: string;
}
