import { IsDefined, IsOptional, ValidateNested } from 'class-validator';

import { NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';
import { ITenantDefine } from '@novu/shared';

import { TriggerEventMulticastCommand } from '../trigger-event';

export class TriggerMulticastCommand extends TriggerEventMulticastCommand {
  @IsDefined()
  template: NotificationTemplateEntity;

  @IsOptional()
  actor?: SubscriberEntity | undefined;

  @ValidateNested()
  tenant: ITenantDefine | null;
}
