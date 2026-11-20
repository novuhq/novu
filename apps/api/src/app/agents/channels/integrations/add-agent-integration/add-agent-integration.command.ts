import { AGENT_ANALYTICS_SOURCES, type AgentAnalyticsSource } from '@novu/shared';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../../shared/commands/project.command';

export class AddAgentIntegrationCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  @IsString()
  @IsOptional()
  integrationIdentifier?: string;

  @IsString()
  @IsOptional()
  providerId?: string;

  /** The app that asked, for analytics. */
  @IsOptional()
  @IsIn(AGENT_ANALYTICS_SOURCES)
  analyticsSource?: AgentAnalyticsSource;
}
