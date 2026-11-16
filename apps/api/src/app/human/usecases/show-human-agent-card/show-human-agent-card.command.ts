import { AGENT_HOST_IDS, AGENT_HOST_VIAS, type AgentHostId, type AgentHostVia } from '@novu/dal';
import { AGENT_ANALYTICS_SOURCES, type AgentAnalyticsSource } from '@novu/shared';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class ShowHumanAgentCardCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  @IsString()
  agentIdentifier?: string;

  /** The way the host showing the card came in. Missing when the request didn't say, as the dashboard's don't. */
  @IsOptional()
  @IsIn(AGENT_HOST_VIAS)
  hostVia?: AgentHostVia;

  /** Which host it said it is. */
  @IsOptional()
  @IsIn(AGENT_HOST_IDS)
  hostId?: AgentHostId;

  /** The app that asked, for analytics. */
  @IsOptional()
  @IsIn(AGENT_ANALYTICS_SOURCES)
  analyticsSource?: AgentAnalyticsSource;
}
