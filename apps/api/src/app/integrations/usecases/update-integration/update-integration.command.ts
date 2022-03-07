import { IsDefined } from 'class-validator';
import { ChannelTypeEnum, ICredentialsDto } from '@notifire/shared';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { ApplicationCommand } from '../../../shared/commands/project.command';

export class UpdateIntegrationCommand extends ApplicationCommand {
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
