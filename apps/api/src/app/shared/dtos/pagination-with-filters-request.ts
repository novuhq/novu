import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { IPaginationWithQueryParams } from '@novu/shared';

import { Constructor } from '../types';
import { PaginationRequestDto } from './pagination-request';

// eslint-disable-next-line @typescript-eslint/naming-convention
export function PaginationWithFiltersRequestDto({
  defaultLimit = 10,
  maxLimit = 100,
  queryDescription,
}: {
  defaultLimit: number;
  maxLimit: number;
  queryDescription: string;
}): Constructor<IPaginationWithQueryParams> {
  class PaginationWithFiltersRequest extends PaginationRequestDto(defaultLimit, maxLimit) {
    @ApiPropertyOptional({
      type: String,
      required: false,
      description: `A query string to filter the results. ${queryDescription}`,
    })
    @IsOptional()
    @IsString()
    query?: string;
  }

  return PaginationWithFiltersRequest;
}
