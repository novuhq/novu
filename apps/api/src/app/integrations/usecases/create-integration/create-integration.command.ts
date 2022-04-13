import { IsDefined } from 'class-validator';
import { ChannelTypeEnum, ICredentialsDto } from '@novu/shared';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class CreateIntegrationCommand extends EnvironmentCommand {
  static create(data: CreateIntegrationCommand) {
    return CommandHelper.create(CreateIntegrationCommand, data);
  }

  @IsDefined()
  providerId: string;

  @IsDefined()
  channel: ChannelTypeEnum;

  @IsDefined()
  credentials: ICredentialsDto;

  @IsDefined()
  active: boolean;
}
