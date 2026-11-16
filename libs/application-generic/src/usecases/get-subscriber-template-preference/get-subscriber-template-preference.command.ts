import { NotificationTemplateEntity, PreferencesEntity, SubscriberEntity } from '@novu/dal';
import { ITenantDefine } from '@novu/shared';
import { IsBoolean, IsDefined, IsOptional } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../commands';

export class GetSubscriberTemplatePreferenceCommand extends EnvironmentWithSubscriber {
  template: NotificationTemplateEntity;

  @IsOptional()
  subscriber?: Pick<SubscriberEntity, '_id'>;

  @IsOptional()
  tenant?: ITenantDefine;

  @IsDefined()
  @IsBoolean()
  includeInactiveChannels: boolean;

  /** See {@link GetPreferencesCommand.subscriberGlobalPreference}. */
  @IsOptional()
  subscriberGlobalPreference?: PreferencesEntity | null;
}
