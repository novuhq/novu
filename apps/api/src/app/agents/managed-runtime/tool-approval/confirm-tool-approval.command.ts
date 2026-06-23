import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import type { ParsedToolApprovalAction } from './approval-card.builder';

export class ConfirmToolApprovalCommand extends EnvironmentWithUserCommand {
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
  @IsNotEmpty()
  agentId: string;

  @IsString()
  @IsOptional()
  subscriberId?: string;

  @IsEnum(AgentPlatformEnum)
  @IsNotEmpty()
  platform: AgentPlatformEnum;

  parsed: ParsedToolApprovalAction;

  @IsString()
  @IsOptional()
  sourceMessageId?: string;

  @IsString()
  @IsNotEmpty()
  platformThreadId: string;

  @IsString()
  @IsOptional()
  actionValue?: string;
}
