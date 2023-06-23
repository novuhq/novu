import { IsDefined } from 'class-validator';
import { ChannelTypeEnum } from '@novu/shared';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class DeactivateSimilarChannelIntegrationsCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  integrationId: string;

  @IsDefined()
  channel: ChannelTypeEnum;
}
