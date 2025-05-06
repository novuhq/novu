import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { SubscriberResponseDto } from '../../subscribers/dtos';
import { CursorPaginationQueryDto } from './cursor-pagination-query.dto';

export class ListSubscribersQueryDto extends CursorPaginationQueryDto<SubscriberResponseDto, 'updatedAt' | '_id'> {
  @ApiProperty({
    description: 'Email address of the subscriber to filter results.',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    description: 'Name of the subscriber to filter results.',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Phone number of the subscriber to filter results.',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Unique identifier of the subscriber to filter results.',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  subscriberId?: string;
}
