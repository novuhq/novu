import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { AgentPlatformEnum } from '../../dtos/agent-platform.enum';
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

  platform?: AgentPlatformEnum;

  parsed: ParsedToolApprovalAction;

  @IsString()
  @IsOptional()
  sourceMessageId?: string;

  @IsString()
  @IsOptional()
  actionValue?: string;
}
