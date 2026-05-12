import { ApiProperty } from '@nestjs/swagger';

export class AddressSummaryDto {
  @ApiProperty()
  address: string;

  @ApiProperty()
  chain: string;

  @ApiProperty()
  balance: number;

  @ApiProperty()
  totalReceived: number;

  @ApiProperty()
  totalSent: number;

  @ApiProperty()
  txCount: number;

  @ApiProperty()
  riskScore: number;

  @ApiProperty({ type: [String] })
  riskFactors: string[];

  @ApiProperty()
  isFlagged: boolean;

  @ApiProperty({ required: false })
  firstSeen?: Date;

  @ApiProperty()
  lastChecked: Date;

  @ApiProperty({ required: false })
  entityLabel?: string;
}
