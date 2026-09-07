import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export enum DirectionEnum {
  ASC = 'ASC',
  DESC = 'DESC',
}

const DEFAULT_MAX_LIMIT = 100;

export function LimitOffsetPaginationQueryDto<T, K extends keyof T>(
  BaseClass: new (...args: any[]) => T,
  allowedFields: K[],
  maxLimit = DEFAULT_MAX_LIMIT
): new () => {
  limit?: number;
  offset?: number;
  orderDirection?: DirectionEnum;
  orderBy?: K;
} {
  class PaginationDto {
    @ApiProperty({
      description: 'Number of items to return per page',
      type: 'number',
      required: false,
      example: 10,
      maximum: maxLimit,
      minimum: 1,
    })
    @Transform(({ value }) => {
      const parsed = Number(value);

      return !Number.isNaN(parsed) ? parsed : undefined;
    })
    @IsNumber()
    @IsInt()
    @Min(1)
    @Max(maxLimit)
    @IsOptional()
    limit?: number;

    @ApiProperty({
      description: 'Number of items to skip before starting to return results',
      type: 'number',
      required: false,
      example: 0,
      minimum: 0,
    })
    @Transform(({ value }) => {
      const parsed = Number(value);

      return !Number.isNaN(parsed) ? parsed : undefined;
    })
    @IsInt()
    @IsNumber()
    @Min(0)
    @IsOptional()
    offset?: number;

    @ApiPropertyOptional({
      description: 'Direction of sorting',
      enum: DirectionEnum,
      enumName: 'DirectionEnum',
      required: false,
    })
    @IsOptional()
    @IsEnum(DirectionEnum)
    orderDirection?: DirectionEnum;

    @ApiPropertyOptional({
      description: 'Field to sort the results by',
      enum: allowedFields,
      enumName: `${BaseClass.name}SortField`,
      type: 'string',
      required: false,
    })
    @IsOptional()
    @IsString()
    @IsEnum(Object.fromEntries(allowedFields.map((field) => [field, field])))
    orderBy?: K;
  }

  return PaginationDto;
}
