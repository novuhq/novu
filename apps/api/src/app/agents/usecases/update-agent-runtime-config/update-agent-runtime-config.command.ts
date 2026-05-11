import { IsNotEmpty, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import type { AgentMcpServerDto, AgentSkillInputDto, AgentToolDto } from '../../dtos/agent-runtime-config.dto';

export class UpdateAgentRuntimeConfigCommand extends EnvironmentWithUserCommand {
  @IsNotEmpty()
  @IsString()
  identifier: string;

  model?: string;
  systemPrompt?: string;
  mcpServers?: AgentMcpServerDto[];
  tools?: AgentToolDto[];
  skills?: AgentSkillInputDto[];
}
