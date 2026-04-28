import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import {
  AGENT_PROGRESS_RENDERERS,
  AGENT_STATUS_STATES,
  AgentProgressTaskDto,
} from '../../dtos/agent-reply-payload.dto';

export class UpdateAgentStatusCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;

  @IsString()
  @IsOptional()
  messageId?: string;

  @IsString()
  @IsOptional()
  platformThreadId?: string;

  @IsString()
  @IsIn(AGENT_STATUS_STATES)
  state: (typeof AGENT_STATUS_STATES)[number];

  @IsString()
  @IsOptional()
  toolName?: string;

  @IsString()
  @IsIn(AGENT_PROGRESS_RENDERERS)
  @IsOptional()
  progressRenderer?: (typeof AGENT_PROGRESS_RENDERERS)[number];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgentProgressTaskDto)
  @IsOptional()
  progressTasks?: AgentProgressTaskDto[];

  @IsOptional()
  retryAfterMs?: number;
}
