import {
  IsDefined,
  IsString,
  IsOptional,
  ValidateNested,
  IsMongoId,
} from 'class-validator';
import { ISubscribersDefine, ITenantDefine } from '@novu/shared';
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
  tenant?: ITenantDefine | null;

  @IsOptional()
  actor?: SubscriberEntity | undefined;

  @IsDefined()
  to: ISubscribersDefine[];

  @IsDefined()
  @IsMongoId()
  templateId: string;

  @IsDefined()
  subscriber: ISubscribersDefine;
}
