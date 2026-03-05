import { MessageFilter } from '@novu/application-generic';
import { ActionIntegrationTypeEnum, ChannelTypeEnum, ICredentialsDto, IntegrationCategoryType } from '@novu/shared';
import { IsArray, IsDefined, IsEnum, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class CreateIntegrationCommand extends EnvironmentCommand {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  identifier?: string;

  @IsDefined()
  @IsString()
  providerId: string;

  @IsDefined()
  @IsEnum({ ...ChannelTypeEnum, ...ActionIntegrationTypeEnum })
  channel: IntegrationCategoryType;

  @IsOptional()
  credentials?: ICredentialsDto;

  @IsOptional()
  active: boolean;

  @IsOptional()
  check: boolean;

  @IsDefined()
  userId: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  conditions?: MessageFilter[];

  @IsOptional()
  @IsObject()
  configurations?: Record<string, string>;
}
