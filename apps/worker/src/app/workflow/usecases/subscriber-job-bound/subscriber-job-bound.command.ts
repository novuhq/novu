import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { SubscriberEntity, TopicEntity } from '@novu/dal';
import { DiscoverWorkflowOutput } from '@novu/framework/internal';
import {
  ISubscribersDefine,
  ITenantDefine,
  StatelessControls,
  SubscriberSourceEnum,
  TriggerOverrides,
  TriggerRequestCategoryEnum,
} from '@novu/shared';
import { IsDefined, IsEnum, IsMongoId, IsOptional, IsString, ValidateNested } from 'class-validator';

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

  @IsOptional()
  @ValidateNested()
  tenant?: ITenantDefine;

  @IsOptional()
  actor?: SubscriberEntity;

  @IsDefined()
  @IsMongoId()
  templateId: string;

  @IsDefined()
  subscriber: ISubscribersDefine;

  @IsOptional()
  topics?: Pick<TopicEntity, '_id' | 'key'>[];

  @IsDefined()
  @IsEnum(SubscriberSourceEnum)
  _subscriberSource: SubscriberSourceEnum;

  @IsOptional()
  @IsEnum(TriggerRequestCategoryEnum)
  requestCategory?: TriggerRequestCategoryEnum;

  bridge?: { url: string; workflow: DiscoverWorkflowOutput };

  controls?: StatelessControls;

  @IsDefined()
  @IsString()
  environmentName: string;
}
