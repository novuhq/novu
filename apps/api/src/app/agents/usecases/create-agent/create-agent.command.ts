import type { AgentRuntime } from '@novu/shared';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { ManagedRuntimeDto } from '../../dtos/agent-runtime-config.dto';

export class CreateAgentCommand extends EnvironmentWithUserCommand {
  @ValidateIf((o) => !o.managedRuntime?.externalAgentId)
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ValidateIf((o) => !o.managedRuntime?.externalAgentId)
  @IsString()
  @IsNotEmpty()
  identifier?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsOptional()
  @IsEnum(['self-hosted', 'managed'] as const)
  runtime?: AgentRuntime;

  @ValidateIf((o) => o.runtime === 'managed')
  @IsObject()
  @ValidateNested()
  @Type(() => ManagedRuntimeDto)
  managedRuntime?: ManagedRuntimeDto;
}
