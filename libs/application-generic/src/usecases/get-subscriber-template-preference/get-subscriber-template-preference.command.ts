import { NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';
import { ITenantDefine } from '@novu/shared';
import { IsDefined, IsNotEmpty, IsOptional } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../commands';

export class GetSubscriberTemplatePreferenceCommand extends EnvironmentWithSubscriber {
  @IsNotEmpty()
  @IsDefined()
  template: NotificationTemplateEntity;

  @IsOptional()
  subscriber?: SubscriberEntity;

  @IsOptional()
  tenant?: ITenantDefine;
}
