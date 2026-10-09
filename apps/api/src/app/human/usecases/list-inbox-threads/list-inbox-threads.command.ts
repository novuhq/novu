import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import {
  HUMAN_INBOX_MAX_WAIT_SECONDS,
  INBOX_READ_FILTERS,
  INBOX_SENDERS_FILTERS,
  INBOX_STATUS_FILTERS,
  type InboxReadFilter,
  type InboxSendersFilter,
  type InboxStatusFilter,
} from '../../dtos/human-inbox.dto';

export class ListInboxThreadsCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  @IsIn(INBOX_READ_FILTERS)
  filter?: InboxReadFilter;

  @IsOptional()
  @IsIn(INBOX_STATUS_FILTERS)
  status?: InboxStatusFilter;

  @IsOptional()
  @IsIn(INBOX_SENDERS_FILTERS)
  senders?: InboxSendersFilter;

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

  @IsOptional()
  @IsString()
  agentIdentifier?: string;
}
