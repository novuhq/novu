import {
  IsDefined,
  IsString,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { ISubscribersDefine, ITenantDefine } from '@novu/shared';

import { EnvironmentWithUserCommand } from '../../commands';

export class TriggerEventCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsString()
  identifier: string;

  @IsDefined()
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsDefined()
  overrides: Record<string, Record<string, unknown>>;

  @IsDefined()
  to: ISubscribersDefine[];

  @IsString()
  @IsDefined()
  transactionId: string;

  @IsOptional()
  actor?: ISubscribersDefine | null;

  @IsOptional()
  @ValidateNested()
  tenant?: ITenantDefine | null;
}
