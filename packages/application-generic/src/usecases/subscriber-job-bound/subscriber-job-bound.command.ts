import {
  IsDefined,
  IsString,
  IsOptional,
  ValidateNested,
  IsMongoId,
  IsEnum,
} from 'class-validator';
import {
  ISubscribersDefine,
  ITenantDefine,
  SubscriberSourceEnum,
  TriggerRequestCategoryEnum,
} from '@novu/shared';
import { SubscriberEntity } from '@novu/dal';

import { EnvironmentWithUserCommand } from '../../commands';

export class SubscriberJobBoundCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  transactionId: string;

  @IsDefined()
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsDefined()
  @IsString()
  identifier: string;

  @IsDefined()
  overrides: Record<string, Record<string, unknown>>;

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

  @IsDefined()
  @IsEnum(SubscriberSourceEnum)
  _subscriberSource: SubscriberSourceEnum;

  @IsOptional()
  @IsEnum(TriggerRequestCategoryEnum)
  requestCategory?: TriggerRequestCategoryEnum;
}
