import { ApiProperty } from '@nestjs/swagger';

export class TransactionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  txHash: string;

  @ApiProperty()
  fromAddress: string;

  @ApiProperty()
  toAddress: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  timestamp: Date;

  @ApiProperty()
  chain: string;

  @ApiProperty({ required: false })
  blockNumber?: number;

  @ApiProperty({ required: false })
  gasPrice?: number;

  @ApiProperty({ required: false })
  gasUsed?: number;
}
