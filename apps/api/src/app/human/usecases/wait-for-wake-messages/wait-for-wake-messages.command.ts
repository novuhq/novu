import {
  AGENT_HOST_IDS,
  AGENT_HOST_VIAS,
  type AgentHostId,
  type AgentHostVia,
  WAKE_HOST_IDS,
  type WakeHostId,
} from '@novu/dal';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { HUMAN_INBOX_MAX_WAIT_SECONDS } from '../../dtos/human-inbox.dto';
import { WAKE_COMPUTER_ID_PATTERN, WAKE_MESSAGES_MAX_LIMIT } from '../../dtos/human-wake.dto';

export class WaitForWakeMessagesCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  @IsString()
  agentIdentifier?: string;

  /** Only the computer and host holding the lease may wait. */
  @IsString()
  @Matches(WAKE_COMPUTER_ID_PATTERN)
  computerId: string;

  @IsIn(WAKE_HOST_IDS)
  host: WakeHostId;

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
  @Max(WAKE_MESSAGES_MAX_LIMIT)
  limit?: number;

  /** The way the wake program came in, for the host's last check: always the CLI so far. */
  @IsOptional()
  @IsIn(AGENT_HOST_VIAS)
  hostVia?: AgentHostVia;

  /** The host the request said it comes from (`Agent-Inbox-Host`), for its last check. Without it, `host`. */
  @IsOptional()
  @IsIn(AGENT_HOST_IDS)
  hostId?: AgentHostId;
}
