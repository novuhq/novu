import { AGENT_INBOX_REACHES, type AgentInboxReach } from '@novu/dal';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class UpdateHumanAgentCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  @IsString()
  agentIdentifier?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(AGENT_INBOX_REACHES)
  reach?: AgentInboxReach;

  @IsOptional()
  @IsBoolean()
  paused?: boolean;
}
