import { IsDefined, IsString, IsOptional, ValidateNested, ValidateIf, IsEnum, IsNumber } from 'class-validator';
import {
  AddressingTypeEnum,
  TriggerRecipients,
  TriggerRecipientSubscriber,
  TriggerRequestCategoryEnum,
  TriggerTenantContext,
} from '@novu/shared';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { ApiHideProperty } from '@nestjs/swagger';

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

  @ApiHideProperty()
  @IsOptional()
  @IsNumber()
  priority?: number;
}

export class ParseEventRequestMulticastCommand extends ParseEventRequestBaseCommand {
  @IsDefined()
  to: TriggerRecipients;

  @IsEnum(AddressingTypeEnum)
  addressingType: AddressingTypeEnum.MULTICAST;
}

export class ParseEventRequestBroadcastCommand extends ParseEventRequestBaseCommand {
  @IsEnum(AddressingTypeEnum)
  addressingType: AddressingTypeEnum.BROADCAST;
}

export type ParseEventRequestCommand = ParseEventRequestMulticastCommand | ParseEventRequestBroadcastCommand;
