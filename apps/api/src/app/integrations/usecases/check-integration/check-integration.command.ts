import { IsDefined, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { ChannelTypeEnum, ICredentials } from '@novu/shared';

export class CheckIntegrationCommand extends EnvironmentCommand {
  @IsDefined()
  @IsString()
  providerId: string;

  @IsDefined()
  channel: ChannelTypeEnum;

  @IsDefined()
  credentials?: ICredentials;
}
