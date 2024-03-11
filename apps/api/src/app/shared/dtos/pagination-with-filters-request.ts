import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

import { Constructor } from '../types';
import { IPagination, PaginationRequestDto } from './pagination-request';

export interface IPaginationWithFilters extends IPagination {
  query?: string;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function PaginationWithFiltersRequestDto({
  defaultLimit = 10,
  maxLimit = 100,
  queryDescription,
}: {
  defaultLimit: number;
  maxLimit: number;
  queryDescription: string;
}): Constructor<IPaginationWithFilters> {
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
