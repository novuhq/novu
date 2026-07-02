import { ApiPropertyOptional } from '@nestjs/swagger';
import { IPaginationParams } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

import { Constructor } from '../types';

export function PaginationRequestDto(defaultLimit = 10, maxLimit = 100): Constructor<IPaginationParams> {
  class PaginationRequest {
    @ApiPropertyOptional({
      type: Number,
      required: false,
      example: 0,
      minimum: 0,
    })
    @Type(() => Number)
    @IsInt()
    @Min(0)
    page = 0;

    @ApiPropertyOptional({
      type: Number,
      required: false,
      default: defaultLimit,
      maximum: maxLimit,
      example: 10,
    })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(maxLimit)
    limit = defaultLimit;
  }

  return PaginationRequest;
}
