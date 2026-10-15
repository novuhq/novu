import type { AgentHostVia } from '@novu/dal';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import {
  HUMAN_INBOX_MAX_WAIT_SECONDS,
  INBOX_READ_FILTERS,
  INBOX_SEARCH_MAX_LENGTH,
  INBOX_SENDERS_FILTERS,
  INBOX_STATUS_FILTERS,
  INBOX_TABS,
  type InboxReadFilter,
  type InboxSendersFilter,
  type InboxStatusFilter,
  type InboxTab,
} from '../../dtos/human-inbox.dto';
import { AGENT_HOST_VIAS } from '../../services/human-host-status.service';

/** The filters the thread list and its counts share. */
export class InboxViewCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  @IsIn(INBOX_TABS)
  tab?: InboxTab;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  channel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(INBOX_SEARCH_MAX_LENGTH)
  search?: string;

  @IsOptional()
  @IsIn(INBOX_SENDERS_FILTERS)
  senders?: InboxSendersFilter;

  @IsOptional()
  @IsString()
  agentIdentifier?: string;
}

export class ListInboxThreadsCommand extends InboxViewCommand {
  @IsOptional()
  @IsIn(INBOX_READ_FILTERS)
  filter?: InboxReadFilter;

  @IsOptional()
  @IsIn(INBOX_STATUS_FILTERS)
  status?: InboxStatusFilter;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  after?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(HUMAN_INBOX_MAX_WAIT_SECONDS)
  waitSeconds?: number;

  /** Set when a host asks, through the CLI or the MCP server: the list is then a check of the inbox. */
  @IsOptional()
  @IsIn(AGENT_HOST_VIAS)
  hostVia?: AgentHostVia;
}
