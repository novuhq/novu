import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CursorPaginationQueryDto } from './cursor-pagination-query.dto';
import { TopicSubscriptionResponseDto } from './topic-subscription-response.dto';

export class ListSubscriberSubscriptionsQueryDto extends CursorPaginationQueryDto<TopicSubscriptionResponseDto, '_id'> {
  @ApiProperty({
    description: 'Filter by topic key',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  key?: string;
}
