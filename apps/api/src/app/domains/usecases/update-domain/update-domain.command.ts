import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { IsBoundedRecord } from '../../validators/bounded-record.validator';

export class UpdateDomainCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  domain: string;

  @IsOptional()
  @IsBoundedRecord()
  data?: Record<string, string>;
}
