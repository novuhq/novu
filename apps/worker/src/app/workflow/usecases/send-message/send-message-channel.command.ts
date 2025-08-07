import type { SubscriberEntity, TenantEntity } from '@novu/dal';
import type { ExecuteOutput } from '@novu/framework/internal';
import type { ITriggerPayload, SeverityLevelEnum } from '@novu/shared';
import { IsDefined, IsOptional } from 'class-validator';
import { SendMessageCommand } from './send-message.command';

export class SendMessageChannelCommand extends SendMessageCommand {
  @IsDefined()
  compileContext: {
    payload?: ITriggerPayload;
    subscriber: SubscriberEntity;
    actor?: SubscriberEntity;
    webhook?: Record<string, unknown>;
    tenant?: TenantEntity;
    step: {
      digest: boolean;
      events: any[] | undefined;
      total_count: number | undefined;
    };
  };

  @IsOptional()
  bridgeData: ExecuteOutput | null;

  @IsOptional()
  severity?: SeverityLevelEnum;
}
