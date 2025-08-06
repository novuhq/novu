import { EnvironmentWithSubscriber } from '@novu/application-generic';
import { IsBoolean, IsDefined } from 'class-validator';

export class GetSubscriberGlobalPreferenceCommand extends EnvironmentWithSubscriber {
  @IsBoolean()
  @IsDefined()
  includeInactiveChannels: boolean;
}
