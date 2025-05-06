import {
  IsDefined,
  IsEnum,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import {
  AddressingTypeEnum,
  StatelessControls,
  TriggerRecipientsPayload,
  TriggerRecipientSubscriber,
  TriggerRequestCategoryEnum,
  TriggerTenantContext,
} from '@novu/shared';
import { DiscoverWorkflowOutput } from '@novu/framework/internal';

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
  actor?: TriggerRecipientSubscriber | null;

  @IsOptional()
  @ValidateIf((_, value) => typeof value !== 'string')
  @ValidateNested()
  tenant?: TriggerTenantContext | null;

  @IsOptional()
  @IsEnum(TriggerRequestCategoryEnum)
  requestCategory?: TriggerRequestCategoryEnum;

  @IsOptional()
  @IsString()
  bridgeUrl?: string;

  @IsOptional()
  bridgeWorkflow?: DiscoverWorkflowOutput;

  controls?: StatelessControls;
}

export class TriggerEventMulticastCommand extends TriggerEventBaseCommand {
  @IsDefined()
  to: TriggerRecipientsPayload;

  @IsEnum(AddressingTypeEnum)
  addressingType: AddressingTypeEnum.MULTICAST;
}

export class TriggerEventBroadcastCommand extends TriggerEventBaseCommand {
  @IsEnum(AddressingTypeEnum)
  addressingType: AddressingTypeEnum.BROADCAST;
}

export type TriggerEventCommand =
  | TriggerEventMulticastCommand
  | TriggerEventBroadcastCommand;
