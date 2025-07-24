import { IsNumber, IsOptional, IsString, Matches, MaxLength, Min, Max, IsArray } from 'class-validator';
import { Type, Transform } from 'class-transformer';

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
  @StatusCodesTransformer
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(100, { each: true })
  @Max(599, { each: true })
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
  @MaxLength(500)
  @Matches(/^[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]*$/, {
    message: 'URL pattern contains invalid characters',
  })
  url_pattern?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  transactionId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'createdGte must be a valid timestamp' })
  @Min(0, { message: 'createdGte must be a positive timestamp' })
  createdGte?: number;
}
