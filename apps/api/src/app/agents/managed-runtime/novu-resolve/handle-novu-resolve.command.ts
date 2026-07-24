import { EnvironmentCommand } from '@novu/application-generic';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';

export class HandleNovuResolveCommand extends EnvironmentCommand {
  @IsString()
  @IsNotEmpty()
  toolUseId: string;

  @IsString()
  @IsOptional()
  summary?: string;

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
