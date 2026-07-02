import { MessageFilter } from '@novu/application-generic';
import { ChannelTypeEnum, ICredentialsDto, IntegrationKindEnum } from '@novu/shared';
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

  @IsOptional()
  @IsEnum(ChannelTypeEnum)
  channel?: ChannelTypeEnum;

  /** Distinguishes delivery integrations from agent-runtime integrations. Defaults to 'delivery'. */
  @IsOptional()
  @IsEnum(IntegrationKindEnum)
  kind?: IntegrationKindEnum;

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
