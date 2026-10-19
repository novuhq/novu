import { NotificationTemplateEntity, PreferencesEntity, SubscriberEntity } from '@novu/dal';
import { IsBoolean, IsDefined, IsOptional } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class GetSubscriberGlobalPreferenceCommand extends EnvironmentWithSubscriber {
  @IsBoolean()
  @IsDefined()
  includeInactiveChannels: boolean;

  @IsOptional()
  subscriber?: Pick<SubscriberEntity, '_id'>;

  @IsOptional()
  workflowList?: NotificationTemplateEntity[];

  /**
   * Optional pre-fetched SUBSCRIBER_GLOBAL preference entity. When provided, the use-case
   * will skip the database lookup and use this value to build the response. Pass `null`
   * (and not `undefined`) to explicitly indicate that no entity was found.
   */
  @IsOptional()
  subscriberGlobalPreference?: PreferencesEntity | null;
}
