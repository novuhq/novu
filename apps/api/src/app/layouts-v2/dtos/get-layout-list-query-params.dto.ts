import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { LimitOffsetPaginationQueryDto } from '../../shared/dtos/limit-offset-pagination.dto';
import { LayoutResponseDto } from './layout-response.dto';

export class GetLayoutListQueryParamsDto extends LimitOffsetPaginationQueryDto(LayoutResponseDto, [
  'createdAt',
  'updatedAt',
  'name',
]) {
  @ApiPropertyOptional({
    description: 'Search query to filter layouts',
    type: 'string',
    required: false,
  })
  @IsOptional()
  @IsString()
  query?: string;
}
