import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AGENT_HOST_IDS, AGENT_HOST_VIAS, type AgentHostId, type AgentHostVia } from '@novu/dal';
import { IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import {
  AGENT_HANDLE_MAX_LENGTH,
  AGENT_HANDLE_PATTERN,
  type ConnectCodeStatus,
} from '../services/human-connect-code.service';
import { HumanAgentQueryDto } from './human-agent.dto';

export class CreateConnectCodeRequestDto extends HumanAgentQueryDto {
  @ApiProperty({
    description:
      'What the host types as `<agent>` in `agentinbox connect <agent> --code <code>`: the part of the agent’s address before the `@`, e.g. `atlas`.',
    maxLength: AGENT_HANDLE_MAX_LENGTH,
  })
  @IsString()
  @Matches(AGENT_HANDLE_PATTERN)
  @MaxLength(AGENT_HANDLE_MAX_LENGTH)
  handle: string;

  @ApiPropertyOptional({
    enum: [...AGENT_HOST_IDS],
    description:
      'The host the code is for: the tab of the host picker it was made on. A host that uses it without saying which host it is counts as this one. Each host gets a code of its own.',
  })
  @IsOptional()
  @IsIn(AGENT_HOST_IDS)
  host?: AgentHostId;
}

export class ConnectCodeResponseDto {
  @ApiProperty({ description: 'The one-time code, e.g. `BCDF-GHJK`. It works once.' })
  code: string;

  @ApiProperty({ description: 'The agent the code connects to, as the host names it.' })
  handle: string;

  @ApiProperty({ description: 'When the code stops working: 10 minutes after it was made.' })
  expiresAt: string;
}

/**
 * A code goes in the body, not the address: it works as a key until it is used or runs out, and addresses
 * end up in logs.
 */
export class ConnectCodeStatusRequestDto extends HumanAgentQueryDto {
  @ApiProperty({
    description: 'The agent the code was made for, as it was asked for: the part of its address before the `@`.',
    maxLength: AGENT_HANDLE_MAX_LENGTH,
  })
  @IsString()
  @Matches(AGENT_HANDLE_PATTERN)
  @MaxLength(AGENT_HANDLE_MAX_LENGTH)
  handle: string;

  @ApiProperty({ description: 'The one-time code, e.g. `BCDF-GHJK`, in any case or spacing.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code: string;
}

export class ConnectCodeStatusResponseDto {
  @ApiProperty({ description: 'The one-time code, e.g. `BCDF-GHJK`.' })
  code: string;

  @ApiProperty({
    enum: ['unused', 'used', 'expired'],
    description:
      '`unused` while it can still connect a host, `used` once a host connected with it, `expired` once it ran out or the account’s key changed after it was made.',
  })
  status: ConnectCodeStatus;

  @ApiProperty({ description: 'When the code stops (or stopped) working: 10 minutes after it was made.' })
  expiresAt: string;

  @ApiPropertyOptional({ description: 'When a host used it. Only on a `used` code.' })
  usedAt?: string;
}

export class ConnectHostRequestDto {
  @ApiProperty({ description: 'The agent, as `agentinbox connect <agent>` names it: `atlas` or `atlas@…`.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(320)
  agent: string;

  @ApiProperty({ description: 'The one-time code from agentinbox.md, e.g. `BCDF-GHJK`.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code: string;
}

export class ConnectHostResponseDto {
  @ApiProperty({ description: 'The key `agentinbox login` would save: the Development key of the agent’s account.' })
  apiKey: string;

  @ApiProperty()
  environmentId: string;

  @ApiProperty({ description: 'The agent the host acts as from now on.' })
  agent: { identifier: string; name: string; handle: string };

  @ApiProperty({
    enum: [...AGENT_HOST_IDS],
    description:
      'The host this computer counts as: the one the CLI said it runs in, else the one the code was made for, else `general`.',
  })
  host: AgentHostId;
}

export class HumanHostDto {
  @ApiProperty({
    enum: [...AGENT_HOST_IDS],
    description:
      'Which host it is. `general` is any other host, one that didn’t say which it is, and the hosts that came in before hosts were told apart.',
  })
  id: AgentHostId;

  @ApiProperty({
    enum: [...AGENT_HOST_VIAS],
    description: 'The way it came in last: the `agentinbox` CLI, or the hosted MCP server.',
  })
  via: AgentHostVia;

  @ApiProperty({ description: 'When it first came in, on any computer: it used a code, or checked the inbox.' })
  connectedAt: string;

  @ApiProperty({ nullable: true, description: 'When it last checked the inbox, on any computer.' })
  lastCheckedAt: string | null;
}

export class HumanHostWaitingMessageDto {
  @ApiProperty({ description: 'The conversation it is in.' })
  conversationId: string;

  @ApiProperty({ description: 'Who wrote it, as the inbox lists them.' })
  from: string;

  @ApiProperty()
  subject: string;

  @ApiProperty({ description: 'When it arrived.' })
  at: string;

  @ApiProperty({ description: 'When a host first saw it.' })
  seenAt: string;
}

export class HumanHostStatusResponseDto {
  @ApiProperty({ description: 'A host used a one-time code, or checked the inbox, at least once.' })
  connected: boolean;

  @ApiProperty({ nullable: true, description: 'The last time any host checked the inbox.' })
  lastCheckedAt: string | null;

  @ApiProperty({
    enum: [...AGENT_HOST_VIAS],
    nullable: true,
    description: 'The way the host of that check came in last.',
  })
  lastCheckedVia: AgentHostVia | null;

  @ApiProperty({ enum: [...AGENT_HOST_IDS], nullable: true, description: 'The host of that check.' })
  lastCheckedHost: AgentHostId | null;

  @ApiProperty({ type: [HumanHostDto], description: 'One entry for each host, last checked first.' })
  hosts: HumanHostDto[];

  @ApiProperty({ nullable: true, description: 'The first time any host checked the inbox.' })
  firstCheckedAt: string | null;

  @ApiProperty({
    type: HumanHostWaitingMessageDto,
    nullable: true,
    description:
      'The newest unread conversation the first check found, which the host has seen since. Null before the first check, and when nothing was waiting then.',
  })
  waitingMessage: HumanHostWaitingMessageDto | null;
}
