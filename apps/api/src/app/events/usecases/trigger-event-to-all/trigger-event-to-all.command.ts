import { TriggerOverrides, TriggerRecipientSubscriber, TriggerTenantContext } from '@novu/shared';
import { IsDefined, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class TriggerEventToAllCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsString()
  identifier: string;

  @IsDefined()
  payload: any;

  @IsString()
  @IsDefined()
  transactionId: string;

  @IsObject()
  @IsOptional()
  overrides?: TriggerOverrides;

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
}
