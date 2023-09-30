import { ApiProperty } from '@nestjs/swagger';

export class ApiKey {
  @ApiProperty()
  key: string;
  @ApiProperty()
  _userId: string;
}
