import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class GetEnvironmentVariablesRequestDto {
  @ApiPropertyOptional({ description: 'Filter variables by key (case-insensitive partial match)' })
  @IsString()
  @MaxLength(256)
  @IsOptional()
  search?: string;
}
