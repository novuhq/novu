import { IsValidContextPayload } from '@novu/application-generic';
import {
  ContextPayload,
  TriggerOverrides,
  TriggerRecipientSubscriber,
  TriggerTenantContext,
} from '@novu/shared';
import { IsDefined, IsNotEmpty, IsObject, IsOptional, IsString, ValidateIf } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class TriggerEventToAllCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsString()
  identifier: string;

  @IsDefined()
  payload: any;

  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsObject()
  @IsOptional()
  overrides?: TriggerOverrides;

  /**
   * Public agent identifier override for this trigger.
   * - omitted → inherit workflow-assigned agent
   * - null → opt out of agent-derived defaults
   * - string → resolve to that agent's ObjectId
   */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  agentId?: string | null;

  @IsOptional()
  actor?: TriggerRecipientSubscriber | null;

  @IsOptional()
  tenant?: TriggerTenantContext | null;

  @IsOptional()
  @IsString()
  bridgeUrl?: string;

  @IsString()
  @IsNotEmpty()
  requestId: string;

  @IsOptional()
  @IsValidContextPayload({ maxCount: 5 })
  context?: ContextPayload;
}
