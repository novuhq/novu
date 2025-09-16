import { NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';
import { ContextId, ITenantDefine } from '@novu/shared';
import { IsDefined, IsOptional, IsString, ValidateNested } from 'class-validator';

import { TriggerEventBroadcastCommand } from '../trigger-event';

export class TriggerBroadcastCommand extends TriggerEventBroadcastCommand {
  @IsDefined()
  template: NotificationTemplateEntity;

  @IsOptional()
  actor?: SubscriberEntity | undefined;

  @ValidateNested()
  tenant: ITenantDefine | null;

  @IsOptional()
  contextId?: ContextId;

  @IsDefined()
  @IsString()
  environmentName: string;
}
