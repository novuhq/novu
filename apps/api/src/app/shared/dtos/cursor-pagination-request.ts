import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';

import type { Constructor, CursorPaginationParams } from '../types';

export function CursorPaginationRequestDto(defaultLimit = 10, maxLimit = 100): Constructor<CursorPaginationParams> {
  class CursorPaginationRequest {
    @ApiPropertyOptional({
      type: Number,
      required: false,
      default: defaultLimit,
      maximum: maxLimit,
      example: 10,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(maxLimit)
    limit = defaultLimit;

    @ApiPropertyOptional()
    @IsOptional()
    @IsMongoId({
      message: 'The after cursor must be a valid MongoDB ObjectId',
    })
    after?: string;

    @ApiPropertyOptional({
      type: Number,
      example: 0,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    offset = 0;
  }

  return CursorPaginationRequest;
}
