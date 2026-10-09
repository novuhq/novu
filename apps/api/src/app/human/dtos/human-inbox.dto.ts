import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HUMAN_INTERACTION_MAX_TTL_SECONDS, HumanInteractionKindEnum } from '@novu/shared';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { HumanInteractionCardDto } from './create-interaction-request.dto';

/** Longest a `?wait=` long-poll holds the request, so it stays under proxy and load-balancer timeouts. */
export const HUMAN_INBOX_MAX_WAIT_SECONDS = 25;

function toBoolean({ value }: { value: unknown }): boolean | string | undefined {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true' || value === '1' || value === '') {
    return true;
  }

  if (value === 'false' || value === '0') {
    return false;
  }

  return typeof value === 'string' ? value : undefined;
}

export class ListInboxQueryDto {
  @ApiPropertyOptional({ description: 'Only threads with a human message newer than the read cursor.' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  unread?: boolean;

  @ApiPropertyOptional({ description: 'Include resolved threads.' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  all?: boolean;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Identifier of the last thread of the previous page.' })
  @IsOptional()
  @IsString()
  after?: string;

  @ApiPropertyOptional({
    description: `Hold the request up to this many seconds until a thread matches (max ${HUMAN_INBOX_MAX_WAIT_SECONDS}).`,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(HUMAN_INBOX_MAX_WAIT_SECONDS)
  wait?: number;

  @ApiPropertyOptional({ description: 'Relay agent whose threads to list. Defaults to `human-relay`.' })
  @IsOptional()
  @IsString()
  agentIdentifier?: string;
}

export class GetInboxThreadQueryDto {
  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Identifier of the oldest message of the previous page.' })
  @IsOptional()
  @IsString()
  before?: string;

  @ApiPropertyOptional({ description: 'Relay agent the thread belongs to. Defaults to `human-relay`.' })
  @IsOptional()
  @IsString()
  agentIdentifier?: string;
}

export class InboxThreadActionQueryDto {
  @ApiPropertyOptional({ description: 'Relay agent the thread belongs to. Defaults to `human-relay`.' })
  @IsOptional()
  @IsString()
  agentIdentifier?: string;
}

export class ReplyInboxThreadRequestDto {
  @ApiProperty({ description: 'Markdown text posted into the thread.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  text: string;
}

export class CreateInboxInteractionRequestDto {
  @ApiProperty({ enum: HumanInteractionKindEnum, description: 'Interaction verb.' })
  @IsEnum(HumanInteractionKindEnum)
  kind: HumanInteractionKindEnum;

  @ApiProperty({ description: 'Kind-specific card. `title` is required. Choose must set `card.options` (2–10).' })
  @IsObject()
  @ValidateNested()
  @Type(() => HumanInteractionCardDto)
  card: HumanInteractionCardDto;

  @ApiPropertyOptional({ description: 'Attribution label of the calling agent, rendered in the message.' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  from?: string;

  @ApiPropertyOptional({ description: 'Seconds until the interaction expires. Default 86400 (24h).' })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(HUMAN_INTERACTION_MAX_TTL_SECONDS)
  ttlSeconds?: number;
}

export type InboxSender = 'human' | 'agent' | 'system';

export interface InboxThreadDto {
  id: string;
  channel: string;
  from: { subscriberId: string; name?: string } | null;
  status: string;
  unreadCount: number;
  lastMessage: { text: string; at: string; from: InboxSender } | null;
  isDirectMessage: boolean;
  lastActivityAt: string;
}

export interface InboxMessageDto {
  id: string;
  from: InboxSender;
  senderName?: string;
  text: string;
  attachments?: Array<{ type?: string; name?: string; mimeType?: string }>;
  interaction?: { id: string; kind: string; status?: string };
  at: string;
}

export interface ListInboxResponseDto {
  data: InboxThreadDto[];
  next: string | null;
}

export interface GetInboxThreadResponseDto {
  thread: InboxThreadDto;
  messages: InboxMessageDto[];
  hasMore: boolean;
}

export interface ReplyInboxThreadResponseDto {
  thread: InboxThreadDto;
  messageId: string;
}
