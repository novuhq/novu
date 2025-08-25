import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

// Custom transformer to convert statusCodes to array of numbers
const StatusCodesTransformer = Transform(({ value }) => {
  if (!value) return undefined;

  // If already an array of numbers, return as is
  if (Array.isArray(value) && value.every((item) => typeof item === 'number')) {
    return value;
  }

  // If array of strings/mixed, convert each to number
  if (Array.isArray(value)) {
    return value.map((item) => parseInt(String(item), 10)).filter((num) => !Number.isNaN(num));
  }

  // If string with comma-separated values
  if (typeof value === 'string' && value.includes(',')) {
    return value
      .split(',')
      .map((item) => parseInt(item.trim(), 10))
      .filter((num) => !Number.isNaN(num));
  }

  // If single string or number
  const num = parseInt(String(value), 10);

  return Number.isNaN(num) ? undefined : [num];
});

export class GetRequestsDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by HTTP status codes',
    type: [Number],
    example: [200, 404, 500],
  })
  @IsOptional()
  @StatusCodesTransformer
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(100, { each: true })
  @Max(599, { each: true })
  statusCodes?: number[];

  @ApiPropertyOptional({
    description: 'Filter by URL pattern',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  @Matches(/^[a-zA-Z0-9\-._~:/?#[\]@!$&"()*+,;=%]*$/, {
    message: 'URL pattern contains invalid characters',
  })
  urlPattern?: string;

  @ApiPropertyOptional({
    description: 'Filter by transaction identifier',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  transactionId?: string;

  @ApiPropertyOptional({
    description: 'Filter requests created after this timestamp (Unix timestamp)',
    minimum: 0,
    example: 1640995200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'createdGte must be a valid timestamp' })
  @Min(0, { message: 'createdGte must be a positive timestamp' })
  createdGte?: number;
}
