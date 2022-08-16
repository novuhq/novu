import { ApiProperty } from '@nestjs/swagger';
import { SubscriberResponseDto } from './subscriber-response.dto';

export class SubscribersResponseDto {
  @ApiProperty({
    description: 'What page you are on in the paginated response',
  })
  page: number;
  @ApiProperty({
    description: 'Total amount of pages',
  })
  totalCount: number;
  @ApiProperty({
    description: 'Number of subscribers on each page',
  })
  pageSize: number;
  @ApiProperty({
    description: 'List of subscribers for current page',
  })
  data: SubscriberResponseDto[];
}
