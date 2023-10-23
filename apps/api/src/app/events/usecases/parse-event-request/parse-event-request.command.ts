import { IsDefined, IsString, IsOptional, ValidateNested } from 'class-validator';
import { AddressingTypeEnum, TriggerRecipients, TriggerRecipientSubscriber, TriggerTenantContext } from '@novu/shared';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class ParseEventRequestCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsString()
  identifier: string;

  @IsDefined()
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsDefined()
  overrides: Record<string, Record<string, unknown>>;

  @IsOptional()
  to?: TriggerRecipients;

  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsOptional()
  @ValidateNested()
  actor?: TriggerRecipientSubscriber | null;

  @IsOptional()
  @ValidateNested()
  tenant?: TriggerTenantContext | null;

  @IsOptional()
  addressingType?: AddressingTypeEnum;
}
