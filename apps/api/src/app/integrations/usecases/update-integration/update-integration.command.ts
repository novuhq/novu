import { MessageFilter } from '@novu/application-generic';
import { IConfigurations, ICredentialsDto } from '@novu/shared';
import { IsArray, IsDefined, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class UpdateIntegrationCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  identifier?: string;

  @IsDefined()
  integrationId: string;

  @IsOptional()
  credentials?: ICredentialsDto;

  @IsOptional()
  active?: boolean;

  @IsOptional()
  check?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  conditions?: MessageFilter[];

  @IsOptional()
  @IsObject()
  configurations?: IConfigurations;
}
