import { ApiProperty } from '@nestjs/swagger';

export class GraphNodeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  riskScore: number;

  @ApiProperty()
  isFlagged: boolean;

  @ApiProperty()
  label: string;

  @ApiProperty({ required: false })
  entityLabel?: string;
}

export class GraphEdgeDto {
  @ApiProperty()
  source: string;

  @ApiProperty()
  target: string;

  @ApiProperty()
  txHash: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  timestamp: Date;
}

export class GraphDataDto {
  @ApiProperty({ type: [GraphNodeDto] })
  nodes: GraphNodeDto[];

  @ApiProperty({ type: [GraphEdgeDto] })
  edges: GraphEdgeDto[];
}
