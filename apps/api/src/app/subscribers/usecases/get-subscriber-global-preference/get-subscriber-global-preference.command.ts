import { IsBoolean, IsDefined } from 'class-validator';
import { EnvironmentWithSubscriber } from '@novu/application-generic';

export class GetSubscriberGlobalPreferenceCommand extends EnvironmentWithSubscriber {
  @IsBoolean()
  @IsDefined()
  includeInactiveChannels: boolean;
}
