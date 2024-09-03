import { IsDefined, IsString } from 'class-validator';
import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class CheckIntegrationCommand extends EnvironmentCommand {
  @IsDefined()
  @IsString()
  providerId: string;

  @IsDefined()
  channel: ChannelTypeEnum;

  @IsDefined()
  credentials?: ICredentials;
}
