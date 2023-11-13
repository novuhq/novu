import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { TopicSubscriberDto } from './topic-subscriber.dto';
import { PaginationDto } from './pagination.dto';

export class GetSubscriberTopicsResponseDto extends PaginationDto {
  data: TopicSubscriberDto[];
}

export class GetSubscriberTopicsRequestDto {
  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional({ type: Number })
  public page?: number;

  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional({ type: Number })
  public pageSize?: number;
}
