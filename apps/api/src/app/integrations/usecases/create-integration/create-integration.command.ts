import { IsDefined, IsEnum, IsOptional, IsString } from 'class-validator';
import { ChannelTypeEnum, ICredentialsDto } from '@novu/shared';

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
}
