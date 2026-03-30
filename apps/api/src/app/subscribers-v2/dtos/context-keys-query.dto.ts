import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class ContextKeysQueryDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;

    return Array.isArray(value) ? value : [value];
  })
  @ApiPropertyOptional({
    description: 'Context keys for filtering notifications in multi-context scenarios',
    type: [String],
  })
  contextKeys?: string[];
}
