import { ApiProperty } from '@nestjs/swagger';

export class ActivityGraphStatesResponse {
  @ApiProperty()
  _id: string;
  @ApiProperty()
  count: number;
}
