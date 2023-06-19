import { ApiProperty } from '@nestjs/swagger';
import { ExecutionDetailsEntity } from '@novu/dal';

export class ExecutionDetailsPaginatedResponseDto {
  @ApiProperty()
  totalCount: number;

  @ApiProperty()
  data: ExecutionDetailsEntity[];

  @ApiProperty()
  hasMore: boolean;

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  page: number;
}
