import { AgentRuntimeEnum } from '@novu/dal';
import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { ManagedRuntimeSetupDto } from '../../dtos/agent-runtime.dto';

export class CreateAgentCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsOptional()
  runtime?: AgentRuntimeEnum;

  @Type(() => ManagedRuntimeSetupDto)
  @IsOptional()
  managedRuntime?: ManagedRuntimeSetupDto;
}
