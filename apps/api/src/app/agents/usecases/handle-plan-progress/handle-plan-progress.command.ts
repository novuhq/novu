import { IsNotEmpty, IsObject, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export interface ToolProgressPayload {
  turnId: string;
  action: 'tool-use' | 'complete' | 'fail' | 'awaiting-approval' | 'approved' | 'denied';
  toolUseId?: string;
  toolName?: string;
  mcpServerName?: string;
  status?: 'running' | 'complete' | 'error';
  toolInput?: Record<string, unknown>;
}

export class HandlePlanProgressCommand extends EnvironmentWithUserCommand {
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
