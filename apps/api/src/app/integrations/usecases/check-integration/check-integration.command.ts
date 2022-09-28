import { IsDefined, IsOptional, IsString, IsBoolean } from 'class-validator';
import { ICredentials } from '@novu/dal';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { ChannelTypeEnum } from '@novu/shared';

export class CheckIntegrationCommand extends EnvironmentCommand {
  @IsDefined()
  @IsString()
  providerId: string;
  @IsDefined()
  channel: ChannelTypeEnum;
  @IsDefined()
  credentials: ICredentials;
}
