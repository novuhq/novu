import { EnvironmentWithSubscriber } from '@novu/application-generic';
import { SubscriberEntity } from '@novu/dal';
import { IsBoolean, IsDefined, IsOptional } from 'class-validator';

export class GetSubscriberGlobalPreferenceCommand extends EnvironmentWithSubscriber {
  @IsBoolean()
  @IsDefined()
  includeInactiveChannels: boolean;

  @IsOptional()
  subscriber?: SubscriberEntity;
}
