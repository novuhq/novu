import { IsDefined } from 'class-validator';
import { ChannelTypeEnum } from '@novu/shared';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class DeactivateSimilarChannelIntegrationsCommand extends EnvironmentCommand {
  static create(data: DeactivateSimilarChannelIntegrationsCommand) {
    return CommandHelper.create(DeactivateSimilarChannelIntegrationsCommand, data);
  }

  @IsDefined()
  integrationId: string;

  @IsDefined()
  channel: ChannelTypeEnum;
}
