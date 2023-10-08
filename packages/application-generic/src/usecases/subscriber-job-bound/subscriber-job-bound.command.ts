import {
  IsDefined,
  IsString,
  IsOptional,
  ValidateNested,
  IsMongoId,
} from 'class-validator';
import {
  ChannelTypeEnum,
  ISubscribersDefine,
  ITenantDefine,
  ProvidersIdEnum,
} from '@novu/shared';
import { NotificationTemplateEntity } from '@novu/dal';
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
  tenant?: ITenantDefine | null;

  @IsOptional()
  actor?: ISubscribersDefine | null;

  @IsDefined()
  to: ISubscribersDefine[];

  @IsDefined()
  @IsMongoId()
  templateId: string;

  @IsDefined()
  subscriber: ISubscribersDefine;
}
