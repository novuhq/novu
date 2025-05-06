import { ApiProperty } from '@nestjs/swagger';

export enum DirectionEnum {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class ResponseError {
  @ApiProperty({
    description: 'The error code or identifier.',
    type: String,
  })
  error: string;

  @ApiProperty({
    description: 'Detailed error message.',
    type: String,
  })
  message: string;

  @ApiProperty({
    description: 'HTTP status code associated with the error.',
    type: Number,
  })
  statusCode: number;
}

export class PaginatedResponse<T> {
  @ApiProperty({
    description: 'Array of data items of type T.',
    type: 'array', // Use 'array' instead of Array
    items: { type: 'object' }, // Define the type of items in the array
  })
  data: T[];

  @ApiProperty({
    description: 'Indicates if there are more items available.',
    type: Boolean,
  })
  hasMore: boolean;

  @ApiProperty({
    description: 'Total number of items available.',
    type: Number,
  })
  totalCount: number;

  @ApiProperty({
    description: 'Number of items per page.',
    type: Number,
  })
  pageSize: number;

  @ApiProperty({
    description: 'Current page number.',
    type: Number,
  })
  page: number;
}

export type KeysOfT<T> = keyof T;

export class CursorPaginationQueryDto<T, K extends keyof T> {
  @ApiProperty({
    description: 'Maximum number of items to return.',
    type: Number,
  })
  limit?: number;

  @ApiProperty({
    description: 'Cursor for pagination, used to fetch the next set of results.',
    type: String,
  })
  cursor?: string;

  @ApiProperty({
    description: 'Direction for ordering results.',
    enum: DirectionEnum,
  })
  orderDirection?: DirectionEnum;

  @ApiProperty({
    description: 'Field by which to order the results.',
    type: String,
  })
  orderBy?: K;
}

export class LimitOffsetPaginationDto<T, K extends KeysOfT<T>> {
  @ApiProperty({
    description: 'Maximum number of items to return.',
    type: String,
  })
  limit: string;

  @ApiProperty({
    description: 'Number of items to skip before starting to collect the result set.',
    type: String,
  })
  offset: string;

  @ApiProperty({
    description: 'Direction for ordering results.',
    enum: DirectionEnum,
  })
  orderDirection?: DirectionEnum;

  @ApiProperty({
    description: 'Field by which to order the results.',
    type: String,
  })
  orderBy?: K;
}

export class PaginationParams {
  @ApiProperty({
    description: 'Current page number.',
    type: Number,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page.',
    type: Number,
  })
  limit: number;
}

export class PaginationWithQueryParams extends PaginationParams {
  @ApiProperty({
    description: 'Optional search query string.',
    type: String,
    required: false,
  })
  query?: string;
}

export enum OrderDirectionEnum {
  ASC = 1,
  DESC = -1,
}

export enum OrderByEnum {
  ASC = 'ASC',
  DESC = 'DESC',
}
