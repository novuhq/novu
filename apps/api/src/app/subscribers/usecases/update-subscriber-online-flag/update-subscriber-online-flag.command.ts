import { IsDefined, IsBoolean } from 'class-validator';

import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class UpdateSubscriberOnlineFlagCommand extends EnvironmentWithSubscriber {
  @IsDefined()
  @IsBoolean()
  isOnline: boolean;
}
