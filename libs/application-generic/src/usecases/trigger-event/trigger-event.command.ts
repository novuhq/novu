import { DiscoverWorkflowOutput } from '@novu/framework/internal';

import {
  AddressingTypeEnum,
  StatelessControls,
  TriggerOverrides,
  TriggerRecipientSubscriber,
  TriggerRecipientsPayload,
  TriggerRequestCategoryEnum,
  TriggerTenantContext,
} from '@novu/shared';
import { IsDefined, IsEnum, IsOptional, IsString, ValidateIf, ValidateNested } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../commands';

export class TriggerEventBaseCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsString()
  identifier: string;

  @IsDefined()
  payload: any;

  @IsDefined()
  overrides: TriggerOverrides;

  @IsString()
  @IsDefined()
  transactionId: string;

  // TODO: remove optional flag after all the workers are migrated to use requestId NV-6475
  @IsString()
  @IsOptional()
  requestId?: string;

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

export type TriggerEventCommand = TriggerEventMulticastCommand | TriggerEventBroadcastCommand;
