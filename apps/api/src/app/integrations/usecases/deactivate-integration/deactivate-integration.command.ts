import { IsDefined } from 'class-validator';
import { ChannelTypeEnum } from '@notifire/shared';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { ApplicationCommand } from '../../../shared/commands/project.command';

export class DeactivateSimilarChannelIntegrationsCommand extends ApplicationCommand {
  static create(data: DeactivateSimilarChannelIntegrationsCommand) {
    return CommandHelper.create(DeactivateSimilarChannelIntegrationsCommand, data);
  }

  @IsDefined()
  integrationId: string;

  @IsDefined()
  channel: ChannelTypeEnum;
}
