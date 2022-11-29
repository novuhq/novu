import { IsDefined } from 'class-validator';
import { ChannelTypeEnum, ICredentialsDto } from '@novu/shared';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class CreateIntegrationCommand extends EnvironmentCommand {
  @IsDefined()
  providerId: string;

  @IsDefined()
  channel: ChannelTypeEnum;

  @IsDefined()
  credentials: ICredentialsDto;

  @IsDefined()
  active: boolean;

  @IsDefined()
  check: boolean;
}
