import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithSubscriber } from '../../../../shared/commands/project.command';

export class CancelAgentRunCommand extends EnvironmentWithSubscriber {
  @IsString()
  @IsNotEmpty()
  conversationIdentifier: string;

  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  agentHash?: string;
}
