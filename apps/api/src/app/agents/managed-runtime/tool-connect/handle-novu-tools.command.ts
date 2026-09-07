import { EnvironmentCommand } from '@novu/application-generic';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';

export enum NovuToolsActionEnum {
  ListAvailable = 'list_available',
  RequestConnect = 'request_connect',
}

export class HandleNovuToolsCommand extends EnvironmentCommand {
  @IsString()
  @IsNotEmpty()
  toolUseId: string;

  @IsEnum(NovuToolsActionEnum)
  action: NovuToolsActionEnum;

  @IsString()
  @IsOptional()
  mcpId?: string;

  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @IsString()
  @IsNotEmpty()
  agentId: string;

  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;

  @IsString()
  @IsNotEmpty()
  subscriberId: string;

  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsEnum(AgentPlatformEnum)
  @IsNotEmpty()
  platform: AgentPlatformEnum;

  @IsString()
  @IsNotEmpty()
  platformThreadId: string;
}
