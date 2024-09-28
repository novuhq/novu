import { NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';
import { IsBoolean, IsDefined, IsNotEmpty, IsOptional } from 'class-validator';

import { ITenantDefine } from '@novu/shared';
import { Transform } from 'class-transformer';
import { EnvironmentWithSubscriber } from '../../commands';

export class GetSubscriberTemplatePreferenceCommand extends EnvironmentWithSubscriber {
  @IsNotEmpty()
  @IsDefined()
  template: NotificationTemplateEntity;

  @IsOptional()
  subscriber?: SubscriberEntity;

  @IsOptional()
  tenant?: ITenantDefine;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  readOnly?: boolean;
}
