import { ApiProperty } from '@nestjs/swagger';
import { IPaginatedResponseDto } from '@novu/shared';

export class PaginatedResponseDto<T> implements IPaginatedResponseDto<T> {
  @ApiProperty({
    description: 'The current page of the paginated response',
  })
  page: number;

  @ApiProperty({
    description: 'Does the list have more items to fetch',
  })
  hasMore: boolean;

  @ApiProperty({
    description: 'Number of items on each page',
  })
  pageSize: number;

  @ApiProperty({
    description: 'The list of items matching the query',
    isArray: true,
    type: Object,
  })
  data: T[];
}
