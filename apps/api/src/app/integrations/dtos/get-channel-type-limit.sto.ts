import { ApiProperty } from '@nestjs/swagger';

export class ChannelTypeLimitDto {
  @ApiProperty({ type: Number })
  limit: number;

  @ApiProperty({ type: Number })
  count: number;
}
