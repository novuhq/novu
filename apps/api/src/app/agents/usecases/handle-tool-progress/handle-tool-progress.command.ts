import { IsNotEmpty, IsObject, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export interface ToolProgressPayload {
  runId: string;
  action: 'tool-use' | 'complete' | 'fail';
  toolUseId?: string;
  toolName?: string;
  status?: 'running' | 'complete' | 'error';
  toolInput?: Record<string, unknown>;
}

export class HandleToolProgressCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;

  @IsObject()
  toolProgress: ToolProgressPayload;
}
