import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { IsDefined, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class CheckIntegrationCommand extends EnvironmentCommand {
  @IsDefined()
  @IsString()
  providerId: string;

  /** Optional because agent-kind integrations do not have a delivery channel. */
  @IsOptional()
  channel?: ChannelTypeEnum;

  @IsDefined()
  credentials?: ICredentials;
}
