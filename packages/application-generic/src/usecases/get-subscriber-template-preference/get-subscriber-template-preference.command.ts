import {
  NotificationTemplateEntity,
  SubscriberEntity,
  SubscriberPreferenceEntity,
} from '@novu/dal';
import { IsDefined, IsNotEmpty, IsOptional } from 'class-validator';

import { EnvironmentWithSubscriber } from '../../commands';
import { ITenantDefine } from '@novu/shared';

export class GetSubscriberTemplatePreferenceCommand extends EnvironmentWithSubscriber {
  @IsNotEmpty()
  @IsDefined()
  template: NotificationTemplateEntity;

  @IsOptional()
  subscriber?: SubscriberEntity;

  @IsOptional()
  tenant?: ITenantDefine;

  @IsOptional()
  preference?: Pick<
    SubscriberPreferenceEntity,
    'channels' | '_templateId' | 'enabled'
  >;
}
