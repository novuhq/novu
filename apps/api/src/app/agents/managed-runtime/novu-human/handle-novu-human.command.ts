import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';

export class HandleNovuHumanCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  toolUseId: string;

  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsOptional()
  input?: Record<string, unknown>;

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
}
