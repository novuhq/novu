import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { IsBoundedRecord } from '../validators/bounded-record.validator';

export class UpdateDomainDto {
  @ApiPropertyOptional({
    description: 'Replaces domain metadata when provided (max 10 keys, 500 characters total for keys+values).',
    type: Object,
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsBoundedRecord()
  data?: Record<string, string>;
}
