import { ApiProperty } from '@nestjs/swagger';

export class UnseenCountResponse {
  @ApiProperty()
  count: number;
}
