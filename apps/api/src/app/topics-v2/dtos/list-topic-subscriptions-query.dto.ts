import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { CursorPaginationQueryDto } from './cursor-pagination-query.dto';
import { TopicSubscriptionResponseDto } from './topic-subscription-response.dto';

export class ListTopicSubscriptionsQueryDto extends CursorPaginationQueryDto<TopicSubscriptionResponseDto, '_id'> {
  @ApiProperty({
    description: 'Filter by subscriber ID',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  subscriberId?: string;

  @ApiPropertyOptional({
    description: 'Filter by exact context keys, order insensitive (format: "type:id")',
    type: String,
    isArray: true,
    example: ['tenant:org-123', 'region:us-east-1'],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (value === '') return [];
    const array = Array.isArray(value) ? value : [value];
    return array.filter((v) => v !== '');
  })
  @IsArray()
  @IsString({ each: true })
  contextKeys?: string[];
}
