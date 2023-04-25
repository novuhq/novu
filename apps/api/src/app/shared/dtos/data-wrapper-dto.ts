/* eslint-disable @typescript-eslint/naming-convention */
import { ApiProperty } from '@nestjs/swagger';

export class DataWrapperDto<T> {
  @ApiProperty()
  data: T;
}
