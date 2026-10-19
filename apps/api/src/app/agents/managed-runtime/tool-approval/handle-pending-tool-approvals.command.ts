import type { Response as ThalamusResponse } from '@novu/thalamus';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';

export class HandlePendingToolApprovalsCommand extends EnvironmentWithUserCommand {
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
  subscriberId?: string;

  @IsEnum(AgentPlatformEnum)
  @IsNotEmpty()
  platform: AgentPlatformEnum;

  @IsString()
  @IsNotEmpty()
  platformThreadId: string;

  /** Who the paused turn answers, when a person triggered it. Lets a resumed reply stream natively. */
  @IsString()
  @IsOptional()
  platformUserId?: string;

  @IsString()
  @IsNotEmpty()
  sessionId: string;

  response: ThalamusResponse;
}
