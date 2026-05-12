import { ApiProperty } from '@nestjs/swagger';

export class FlaggedAddressResponseDto {
  @ApiProperty()
  isFlagged: boolean;

  @ApiProperty({ type: [String] })
  reasons: string[];
}
