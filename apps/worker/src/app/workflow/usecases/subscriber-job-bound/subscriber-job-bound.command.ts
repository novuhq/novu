import { EnvironmentWithUserCommand, SubscriberTopicPreference } from '@novu/application-generic';
import { SubscriberEntity } from '@novu/dal';
import { DiscoverWorkflowOutput } from '@novu/framework/internal';
import {
  ContextPayload,
  ISubscribersDefine,
  ITenantDefine,
  StatelessControls,
  SubscriberSourceEnum,
  TriggerOverrides,
  TriggerRequestCategoryEnum,
} from '@novu/shared';
import { IsArray, IsDefined, IsEnum, IsMongoId, IsOptional, IsString, ValidateIf, ValidateNested } from 'class-validator';

export class SubscriberJobBoundCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  transactionId: string;

  // TODO: remove optional flag after all the workers are migrated to use requestId NV-6475
  @IsString()
  @IsOptional()
  requestId?: string;

  @IsDefined()
  payload: any;

  @IsDefined()
  @IsString()
  identifier: string;

  @IsDefined()
  overrides: TriggerOverrides;

  /**
   * Resolved Agent ObjectId for this trigger execution.
   * - omitted → inherit workflow-assigned agent
   * - null → opt out of agent-derived defaults
   * - string → use that trigger-selected agent
   */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsMongoId()
  _agentId?: string | null;

  @IsOptional()
  @ValidateNested()
  tenant?: ITenantDefine;

  @IsOptional()
  actor?: SubscriberEntity;

  @IsArray()
  @IsString({ each: true })
  contextKeys: string[];

  @IsOptional()
  context?: ContextPayload;

  @IsDefined()
  @IsMongoId()
  templateId: string;

  @IsDefined()
  subscriber: ISubscribersDefine;

  @IsOptional()
  topics?: SubscriberTopicPreference[];

  @IsDefined()
  @IsEnum(SubscriberSourceEnum)
  _subscriberSource: SubscriberSourceEnum;

  @IsOptional()
  @IsEnum(TriggerRequestCategoryEnum)
  requestCategory?: TriggerRequestCategoryEnum;

  bridge?: { url: string; workflow: DiscoverWorkflowOutput };

  controls?: StatelessControls;
}
