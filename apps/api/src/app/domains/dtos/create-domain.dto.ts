import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsFQDN, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { IsBoundedRecord } from '../validators/bounded-record.validator';
import { InboundSenderAuthDto } from './inbound-sender-auth.dto';

export class CreateDomainDto {
  @ApiProperty({ description: 'The domain name (e.g. "recent.dev")' })
  @IsString()
  @IsNotEmpty()
  @IsFQDN({
    require_tld: true,
    allow_underscores: false,
    allow_trailing_dot: false,
    allow_numeric_tld: false,
    allow_wildcard: false,
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Optional string key-value metadata (max 10 keys, 500 characters total for keys+values).',
    type: Object,
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsBoundedRecord()
  data?: Record<string, string>;

  @ApiPropertyOptional({
    type: InboundSenderAuthDto,
    description:
      'Which sender-authentication verdicts must be pass. Omit a flag to require it. Both flags cannot be false.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => InboundSenderAuthDto)
  inboundSenderAuth?: InboundSenderAuthDto;
}
