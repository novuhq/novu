import { IsDefined, IsString, IsOptional, ValidateNested } from 'class-validator';
import { TriggerRecipients, TriggerRecipientSubscriber, TriggerTenantContext } from '@novu/shared';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class ParseEventRequestCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsString()
  identifier: string;

  @IsDefined()
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsDefined()
  overrides: Record<string, Record<string, unknown>>;

  @IsDefined()
  to: TriggerRecipients;

  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsOptional()
  actor?: TriggerRecipientSubscriber | null;

  @IsOptional()
  @ValidateNested()
  tenant?: TriggerTenantContext | null;
}
