import {
  IsDefined,
  IsString,
  IsOptional,
  ValidateNested,
  ValidateIf,
  IsEnum,
} from 'class-validator';
import {
  AddressingTypeEnum,
  ISubscribersDefine,
  ITenantDefine,
} from '@novu/shared';

import { EnvironmentWithUserCommand } from '../../commands';

export class TriggerEventBaseCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsString()
  identifier: string;

  @IsDefined()
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsDefined()
  overrides: Record<string, Record<string, unknown>>;

  @IsString()
  @IsDefined()
  transactionId: string;

  @IsOptional()
  @ValidateIf((_, value) => typeof value !== 'string')
  @ValidateNested()
  actor?: ISubscribersDefine | null;

  @IsOptional()
  @ValidateIf((_, value) => typeof value !== 'string')
  @ValidateNested()
  tenant?: ITenantDefine | null;
}

export class TriggerEventMulticastCommand extends TriggerEventBaseCommand {
  @IsDefined()
  to: ISubscribersDefine[];
}

export class TriggerEventBroadcastCommand extends TriggerEventBaseCommand {
  @IsDefined()
  @IsEnum(AddressingTypeEnum)
  addressingType: AddressingTypeEnum;
}

export type TriggerEventCommand =
  | TriggerEventMulticastCommand
  | TriggerEventBroadcastCommand;
