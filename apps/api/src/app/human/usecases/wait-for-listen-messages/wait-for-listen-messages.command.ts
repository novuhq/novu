import {
  AGENT_HOST_IDS,
  AGENT_HOST_VIAS,
  type AgentHostId,
  type AgentHostVia,
  LISTEN_HOST_IDS,
  type ListenHostId,
} from '@novu/dal';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { HUMAN_INBOX_MAX_WAIT_SECONDS } from '../../dtos/human-inbox.dto';
import { LISTEN_COMPUTER_ID_PATTERN, LISTEN_MESSAGES_MAX_LIMIT } from '../../dtos/human-listen.dto';

export class WaitForListenMessagesCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  @IsString()
  agentIdentifier?: string;

  /** Only the computer and host holding the lease may wait. */
  @IsString()
  @Matches(LISTEN_COMPUTER_ID_PATTERN)
  computerId: string;

  @IsIn(LISTEN_HOST_IDS)
  host: ListenHostId;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  after?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(HUMAN_INBOX_MAX_WAIT_SECONDS)
  waitSeconds?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(LISTEN_MESSAGES_MAX_LIMIT)
  limit?: number;

  /** The way the listener came in, for the host's last check: always the CLI so far. */
  @IsOptional()
  @IsIn(AGENT_HOST_VIAS)
  hostVia?: AgentHostVia;

  /** The host the request said it comes from (`Agent-Inbox-Host`), for its last check. Without it, `host`. */
  @IsOptional()
  @IsIn(AGENT_HOST_IDS)
  hostId?: AgentHostId;
}
