import { IsNumber, IsOptional, IsString, Matches, MaxLength, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

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

  @IsString()
  @IsOptional()
  @Matches(/^[0-9]{3}$/, { message: 'Status code must be a 3-digit number' })
  statusCode?: string;

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
}
