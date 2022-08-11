import { IsDefined } from 'class-validator';
import { ChannelTypeEnum } from '@novu/shared';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class DeactivateSimilarChannelIntegrationsCommand extends EnvironmentCommand {
  @IsDefined()
  integrationId: string;

  @IsDefined()
  channel: ChannelTypeEnum;
}
