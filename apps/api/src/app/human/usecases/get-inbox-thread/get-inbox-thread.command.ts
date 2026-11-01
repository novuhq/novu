import { AGENT_HOST_IDS, AGENT_HOST_VIAS, type AgentHostId, type AgentHostVia } from '@novu/dal';
import { AGENT_ANALYTICS_SOURCES, type AgentAnalyticsSource } from '@novu/shared';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { INBOX_THREAD_INCLUDES, type InboxThreadInclude } from '../../dtos/human-inbox.dto';
import { InboxThreadCommand } from '../inbox-thread.command';

export class GetInboxThreadCommand extends InboxThreadCommand {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  before?: string;

  /** The newest message already read: the page is what came after it. Not together with `before`. */
  @IsOptional()
  @IsString()
  after?: string;

  @IsOptional()
  @IsIn(INBOX_THREAD_INCLUDES)
  include?: InboxThreadInclude;

  /** Set when a host asks, through the CLI or the MCP server: opening the thread is then a check of the inbox. */
  @IsOptional()
  @IsIn(AGENT_HOST_VIAS)
  hostVia?: AgentHostVia;

  /** Which host it said it is, when it said. One that didn't counts as `general`. */
  @IsOptional()
  @IsIn(AGENT_HOST_IDS)
  hostId?: AgentHostId;

  /** The app that asked, for analytics. */
  @IsOptional()
  @IsIn(AGENT_ANALYTICS_SOURCES)
  analyticsSource?: AgentAnalyticsSource;
}
