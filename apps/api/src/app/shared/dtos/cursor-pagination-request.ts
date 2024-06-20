import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, isMongoId, Max, Min } from 'class-validator';

import type { Constructor, CursorPaginationParams } from '../types';
import { IsMongoIdOrNumber } from '../validators/mongo-id-or-number';

// eslint-disable-next-line @typescript-eslint/naming-convention
export function CursorPaginationRequestDto(defaultLimit = 10, maxLimit = 100): Constructor<CursorPaginationParams> {
  class CursorPaginationRequest {
    @ApiPropertyOptional({
      type: Number,
      required: false,
      default: defaultLimit,
      maximum: maxLimit,
    })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(maxLimit)
    limit = defaultLimit;

    @ApiPropertyOptional({ oneOf: [{ type: 'string' }, { type: 'number' }] })
    @IsMongoIdOrNumber({
      message: 'The after cursor must be a valid MongoDB ObjectId or an integer greater or equal to 0.',
    })
    @Transform(({ value }) => {
      const isMongoIdValue = isMongoId(value);
      if (isMongoIdValue) return value;

      return Number(value ?? 0);
    })
    after = 0;
  }

  return CursorPaginationRequest;
}
