import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class CustomControlDto {
  @ApiPropertyOptional({
    description: 'Custom control values for the step.',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  @IsOptional()
  custom?: Record<string, unknown>;
}
