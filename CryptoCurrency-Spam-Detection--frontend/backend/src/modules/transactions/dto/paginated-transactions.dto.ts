import { ApiProperty } from '@nestjs/swagger';
import { TransactionDto } from './transaction.dto';

export class PaginatedTransactionsDto {
  @ApiProperty({ type: [TransactionDto] })
  data: TransactionDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
