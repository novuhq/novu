import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { InboundSenderAuthDto } from '../../dtos/inbound-sender-auth.dto';
import { IsBoundedRecord } from '../../validators/bounded-record.validator';

export class UpdateDomainCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  domain: string;

  @IsOptional()
  @IsBoundedRecord()
  data?: Record<string, string>;

  @IsOptional()
  @ValidateNested()
  @Type(() => InboundSenderAuthDto)
  inboundSenderAuth?: InboundSenderAuthDto;
}
