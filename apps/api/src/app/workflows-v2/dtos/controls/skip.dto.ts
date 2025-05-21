import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class SkipControlDto {
  @ApiPropertyOptional({
    description: 'Filter conditions for skipping the step.',
    type: 'object',
    example: { type: 'AND', children: [{ field: 'is_online', value: true, operator: 'EQUAL' }] },
  })
  @IsObject()
  @IsOptional()
  skip?: Record<string, unknown>;

  [key: string]: any;
}
