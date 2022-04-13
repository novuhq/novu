import { IsDefined } from 'class-validator';
import { ChannelTypeEnum, ICredentialsDto } from '@novu/shared';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class UpdateIntegrationCommand extends EnvironmentCommand {
  static create(data: UpdateIntegrationCommand) {
    return CommandHelper.create(UpdateIntegrationCommand, data);
  }
  @IsDefined()
  integrationId: string;

  @IsDefined()
  credentials: ICredentialsDto;

  @IsDefined()
  active: boolean;
}
