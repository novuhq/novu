import { ApiProperty } from '@nestjs/swagger';
import { ExecutionDetailsEntity } from '@novu/dal';

export class ExecutionDetailsFilterResponseDto {
  @ApiProperty()
  totalCount: number;

  @ApiProperty()
  data: ExecutionDetailsEntity[];

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  page: number;
}
