import { IsDefined, IsEnum, IsOptional, IsString, ValidateIf, ValidateNested } from 'class-validator';
import {
  AddressingTypeEnum,
  StatelessControls,
  TriggerRecipientsPayload,
  TriggerRecipientSubscriber,
  TriggerRequestCategoryEnum,
  TriggerTenantContext,
} from '@novu/shared';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class ParseEventRequestBaseCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsString()
  identifier: string;

  @IsDefined()
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsDefined()
  overrides: Record<string, Record<string, unknown>>;

  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsOptional()
  @ValidateIf((_, value) => typeof value !== 'string')
  @ValidateNested()
  actor?: TriggerRecipientSubscriber | null;

  @IsOptional()
  @ValidateNested()
  @ValidateIf((_, value) => typeof value !== 'string')
  tenant?: TriggerTenantContext | null;

  @IsOptional()
  @IsEnum(TriggerRequestCategoryEnum)
  requestCategory?: TriggerRequestCategoryEnum;

  @IsString()
  @IsOptional()
  bridgeUrl?: string;
  /**
   * A mapping of step IDs to their corresponding data.
   * Built for stateless triggering by the local studio, those values will not be persisted outside the job scope
   * First key is step id, second is controlId, value is the control value
   * @type {Record<stepId, Data>}
   * @optional
   */
  controls?: StatelessControls;
}

export class ParseEventRequestMulticastCommand extends ParseEventRequestBaseCommand {
  @IsDefined()
  to: TriggerRecipientsPayload;

  @IsEnum(AddressingTypeEnum)
  addressingType: AddressingTypeEnum.MULTICAST;
}

export class ParseEventRequestBroadcastCommand extends ParseEventRequestBaseCommand {
  @IsEnum(AddressingTypeEnum)
  addressingType: AddressingTypeEnum.BROADCAST;
}

export type ParseEventRequestCommand = ParseEventRequestMulticastCommand | ParseEventRequestBroadcastCommand;
