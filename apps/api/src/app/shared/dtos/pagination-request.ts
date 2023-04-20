import { ApiPropertyOptional } from '@nestjs/swagger';

export type Constructor<I> = new (...args: any[]) => I;

// eslint-disable-next-line @typescript-eslint/naming-convention
export function PaginationRequestDto(defaultLimit = 10, maxLimit = 100): Constructor<any> {
  class PaginationRequest {
    @ApiPropertyOptional({
      type: Number,
      required: false,
    })
    page?: number = 0;

    @ApiPropertyOptional({
      type: Number,
      required: false,
      default: defaultLimit,
      maximum: maxLimit,
    })
    limit?: number = 10;
  }

  return PaginationRequest;
}
