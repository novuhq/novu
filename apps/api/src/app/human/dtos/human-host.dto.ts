import { ApiProperty } from '@nestjs/swagger';
import type { AgentHostVia } from '@novu/dal';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { AGENT_HANDLE_MAX_LENGTH, AGENT_HANDLE_PATTERN } from '../services/human-connect-code.service';
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
}

export class ConnectCodeResponseDto {
  @ApiProperty({ description: 'The one-time code, e.g. `BCDF-GHJK`. It works once.' })
  code: string;

  @ApiProperty({ description: 'The agent the code connects to, as the host names it.' })
  handle: string;

  @ApiProperty({ description: 'When the code stops working: 10 minutes after it was made.' })
  expiresAt: string;
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
}

export class HumanHostDto {
  @ApiProperty({ enum: ['cli', 'mcp'], description: 'The `agentinbox` CLI, or the hosted MCP server.' })
  via: AgentHostVia;

  @ApiProperty({ description: 'When a host first came in this way: it used a code, or checked the inbox.' })
  connectedAt: string;

  @ApiProperty({ nullable: true, description: 'When a host last checked the inbox this way.' })
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

  @ApiProperty({ enum: ['cli', 'mcp'], nullable: true, description: 'How the host of that check came in.' })
  lastCheckedVia: AgentHostVia | null;

  @ApiProperty({ type: [HumanHostDto], description: 'One entry for each way hosts came in, last checked first.' })
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
