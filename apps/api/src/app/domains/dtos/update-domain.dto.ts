import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { IsBoundedRecord } from '../validators/bounded-record.validator';
import { InboundSenderAuthDto } from './inbound-sender-auth.dto';

export class UpdateDomainDto {
  @ApiPropertyOptional({
    description: 'Replaces domain metadata when provided (max 10 keys, 500 characters total for keys+values).',
    type: Object,
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsBoundedRecord()
  data?: Record<string, string>;

  @ApiPropertyOptional({
    type: InboundSenderAuthDto,
    description:
      'Merges into the stored sender-auth flags. Omit a flag to leave it unchanged. Both flags cannot be false.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => InboundSenderAuthDto)
  inboundSenderAuth?: InboundSenderAuthDto;
}
