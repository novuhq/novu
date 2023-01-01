import { ExternalSubscriberId } from '@novu/shared';
import { IsArray, IsDefined } from 'class-validator';

import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class SearchByExternalSubscriberIdsCommand extends EnvironmentCommand {
  @IsArray()
  @IsDefined()
  externalSubscriberIds: ExternalSubscriberId[];
}
