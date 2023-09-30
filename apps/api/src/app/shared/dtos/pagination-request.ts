import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export type Constructor<I> = new (...args: any[]) => I;

// eslint-disable-next-line @typescript-eslint/naming-convention
export function PaginationRequestDto(defaultLimit = 10, maxLimit = 100): Constructor<any> {
  class PaginationRequest {
    @ApiPropertyOptional({
      type: Number,
      required: false,
    })
    @Type(() => Number)
    @IsInt()
    page?: number = 0;

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
    limit?: number = defaultLimit;
  }

  return PaginationRequest;
}
