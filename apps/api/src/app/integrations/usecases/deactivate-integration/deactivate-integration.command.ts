import { IsDefined } from 'class-validator';
import { ChannelTypeEnum } from '@notifire/shared';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { ApplicationCommand } from '../../../shared/commands/project.command';

export class DeactivateIntegrationCommand extends ApplicationCommand {
  static create(data: DeactivateIntegrationCommand) {
    return CommandHelper.create(DeactivateIntegrationCommand, data);
  }

  @IsDefined()
  integrationId: string;

  @IsDefined()
  channel: ChannelTypeEnum;
}
