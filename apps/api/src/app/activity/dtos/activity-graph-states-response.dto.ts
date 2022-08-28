import { ApiProperty } from '@nestjs/swagger';

export class ActivityGraphqStatesResponse {
  @ApiProperty()
  _id: string;
  @ApiProperty()
  count: number;
}
