import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CursorPaginationQueryDto } from './cursor-pagination-query.dto';
import { TopicResponseDto } from './topic-response.dto';

export class ListTopicsQueryDto extends CursorPaginationQueryDto<TopicResponseDto, 'createdAt' | 'updatedAt' | '_id'> {
  @ApiProperty({
    description: 'Key of the topic to filter results.',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  key?: string;

  @ApiProperty({
    description: 'Name of the topic to filter results.',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;
}
