import { IsNotEmpty, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../../shared/commands/project.command';
import type { AgentSkillInputDto, AgentToolDto } from '../../../shared/dtos/agent-runtime-config.dto';

export class UpdateAgentRuntimeConfigCommand extends EnvironmentWithUserCommand {
  @IsNotEmpty()
  @IsString()
  identifier: string;

  model?: string;
  systemPrompt?: string;
  tools?: AgentToolDto[];
  skills?: AgentSkillInputDto[];
}
