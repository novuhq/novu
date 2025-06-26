import { IsNumber, IsOptional, IsString, Matches, MaxLength, Min, Max, IsArray } from 'class-validator';
import { Type, Transform } from 'class-transformer';

// Custom transformer to convert statusCode to array of numbers
const StatusCodeTransformer = Transform(({ value }) => {
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
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @StatusCodeTransformer
  statusCodes?: number[];

  @IsString()
  @IsOptional()
  @MaxLength(500)
  @Matches(/^[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]*$/, {
    message: 'URL contains invalid characters',
  })
  url?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  transactionId?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(2160) // 90 days * 24 hours
  created?: number;
}
