import { IsDefined, IsOptional, IsString, IsBoolean } from 'class-validator';
import { ICredentials } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class CheckIntegrationCommand extends EnvironmentCommand {
  @IsDefined()
  @IsString()
  providerId: string;
  @IsDefined()
  channel: ChannelTypeEnum;
  @IsDefined()
  credentials: ICredentials;
}
