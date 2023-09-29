import { IsArray, IsDefined, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ChannelTypeEnum, ICredentialsDto } from '@novu/shared';

import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { MessageFilter } from '../../../workflows/usecases/create-notification-template';

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
  @IsEnum(ChannelTypeEnum)
  channel: ChannelTypeEnum;

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
}
