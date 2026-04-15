import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { AgentBehaviorDto } from '../../dtos/agent-behavior.dto';

export class UpdateAgentCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ValidateNested()
  @Type(() => AgentBehaviorDto)
  @IsOptional()
  behavior?: AgentBehaviorDto;
}
