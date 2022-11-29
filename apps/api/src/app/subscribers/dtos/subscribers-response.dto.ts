import { ApiProperty } from '@nestjs/swagger';
import { SubscriberResponseDto } from './subscriber-response.dto';

export class SubscribersResponseDto {
  @ApiProperty({
    description: 'The current page of the paginated response',
  })
  page: number;

  @ApiProperty({
    description: 'Total count of subscribers matching the query',
  })
  totalCount: number;

  @ApiProperty({
    description: 'Number of subscribers on each page',
  })
  pageSize: number;

  @ApiProperty({
    description: 'The list of subscribers matching the query',
    isArray: true,
    type: SubscriberResponseDto,
  })
  data: SubscriberResponseDto[];
}
