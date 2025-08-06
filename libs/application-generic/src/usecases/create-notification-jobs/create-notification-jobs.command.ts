// TODO: We shouldn't be importing from DAL here. Needs big refactor throughout monorepo.
import { NotificationTemplateEntity, SubscriberEntity, TopicEntity } from '@novu/dal';
import {
  ChannelTypeEnum,
  ISubscribersDefine,
  ITenantDefine,
  ProvidersIdEnum,
  StatelessControls,
  TriggerOverrides,
  WorkflowPreferences,
} from '@novu/shared';
import { IsDefined, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../commands';

export class CreateNotificationJobsCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsString()
  identifier: string;

  @IsDefined()
  overrides: TriggerOverrides;

  @IsDefined()
  payload: any;

  @IsDefined()
  subscriber: SubscriberEntity;

  @IsDefined()
  template: NotificationTemplateEntity;

  @IsDefined()
  templateProviderIds: Record<ChannelTypeEnum, ProvidersIdEnum>;

  @IsDefined()
  to: ISubscribersDefine;

  @IsOptional()
  topics?: Pick<TopicEntity, '_id' | 'key'>[];

  @IsString()
  @IsDefined()
  transactionId: string;

  @IsOptional()
  actor?: SubscriberEntity;

  @IsOptional()
  tenant?: ITenantDefine;

  bridgeUrl?: string;

  controls?: StatelessControls;

  preferences?: WorkflowPreferences;
}
