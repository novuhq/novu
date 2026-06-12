import type { Response as ThalamusResponse } from '@novu/thalamus';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

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

  @IsString()
  @IsOptional()
  platform?: string;

  @IsString()
  @IsNotEmpty()
  sessionId: string;

  response: ThalamusResponse;
}
