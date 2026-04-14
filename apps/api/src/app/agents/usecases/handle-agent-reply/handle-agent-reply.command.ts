import { IsArray, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class HandleAgentReplyCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;

  @IsOptional()
  @IsObject()
  reply?: { text: string };

  @IsOptional()
  @IsObject()
  update?: { text: string };

  @IsOptional()
  @IsObject()
  resolve?: { summary?: string };

  @IsOptional()
  @IsArray()
  signals?: Signal[];
}

export type Signal =
  | { type: 'metadata'; key: string; value: unknown }
  | { type: 'trigger'; workflowId: string; to?: string; payload?: Record<string, unknown> };
