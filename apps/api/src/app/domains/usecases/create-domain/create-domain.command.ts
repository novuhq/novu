import { Type } from 'class-transformer';
import { IsFQDN, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { InboundSenderAuthDto } from '../../dtos/inbound-sender-auth.dto';
import { IsBoundedRecord } from '../../validators/bounded-record.validator';

export class CreateDomainCommand extends EnvironmentWithUserCommand {
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

  @IsOptional()
  @IsBoundedRecord()
  data?: Record<string, string>;

  @IsOptional()
  @ValidateNested()
  @Type(() => InboundSenderAuthDto)
  inboundSenderAuth?: InboundSenderAuthDto;
}
