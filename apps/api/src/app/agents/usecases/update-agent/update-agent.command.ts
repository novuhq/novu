import { IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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

  @ValidateNested()
  @Type(() => AgentBehaviorDto)
  @IsOptional()
  behavior?: AgentBehaviorDto;
}
