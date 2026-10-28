import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LISTEN_HOST_IDS, type ListenHostId } from '@novu/dal';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { HumanAgentQueryDto } from './human-agent.dto';
import { HUMAN_INBOX_MAX_WAIT_SECONDS, type InboxAttachmentDto } from './human-inbox.dto';
import { trimmed } from './setup-human-relay.dto';

/** The id `agentinbox listen` makes for a computer the first time it runs there, and keeps in its config. */
export const LISTEN_COMPUTER_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

export const LISTEN_COMPUTER_NAME_MAX_LENGTH = 64;

export const LISTEN_PROJECT_MAX_LENGTH = 200;

export const LISTEN_MESSAGES_DEFAULT_LIMIT = 20;

export const LISTEN_MESSAGES_MAX_LIMIT = 50;

/** An opaque cursor is short; anything much longer is not one of ours. */
const LISTEN_CURSOR_MAX_LENGTH = 256;

/** Who asks: a computer and the host it starts there. Together they are the lease's holder. */
class ListenHolderDto extends HumanAgentQueryDto {
  @ApiProperty({
    description: 'The computer asking: the random id `agentinbox listen` keeps for it, of `[A-Za-z0-9_-]`.',
    minLength: 16,
    maxLength: 64,
  })
  @IsString()
  @Matches(LISTEN_COMPUTER_ID_PATTERN)
  computerId: string;

  @ApiProperty({
    enum: [...LISTEN_HOST_IDS],
    description: 'The host it starts there, never a chat app. The same computer with another host is another holder.',
  })
  @IsIn(LISTEN_HOST_IDS)
  host: ListenHostId;
}

export class TakeListenLeaseRequestDto extends ListenHolderDto {
  @ApiProperty({
    description: 'What the operator calls this computer, as the dashboard shows it: "MacBook".',
    maxLength: LISTEN_COMPUTER_NAME_MAX_LENGTH,
  })
  // Trimmed, so a name of spaces counts as none.
  @Transform(trimmed)
  @IsString()
  @MinLength(1)
  @MaxLength(LISTEN_COMPUTER_NAME_MAX_LENGTH)
  computerName: string;

  @ApiPropertyOptional({
    description: 'The folder the host runs in, as the operator reads it: "~/projects/app".',
    maxLength: LISTEN_PROJECT_MAX_LENGTH,
  })
  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(LISTEN_PROJECT_MAX_LENGTH)
  project?: string;

  @ApiPropertyOptional({
    description:
      'Take the lease from whoever holds it. Without it, another holder’s live lease answers 409 `listening_elsewhere`.',
  })
  @IsOptional()
  @IsBoolean()
  takeOver?: boolean;
}

export class ReleaseListenLeaseRequestDto extends ListenHolderDto {}

export class ListenTypingRequestDto extends ListenHolderDto {
  @ApiProperty({
    description: 'The conversation the started host works on, as the messages wait gave it.',
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  conversationId: string;
}

export class ListenTypingResponseDto {
  @ApiProperty({ description: 'Whether the chat shows it: false where it has no typing indicator, as in email.' })
  typing: boolean;
}

export class ListenMessagesQueryDto extends ListenHolderDto {
  @ApiPropertyOptional({ description: 'The `next` of the last answer. Without it, only messages from now on count.' })
  @IsOptional()
  @IsString()
  @MaxLength(LISTEN_CURSOR_MAX_LENGTH)
  after?: string;

  @ApiPropertyOptional({
    description: `Hold the request up to this many seconds until a message comes (max ${HUMAN_INBOX_MAX_WAIT_SECONDS}).`,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(HUMAN_INBOX_MAX_WAIT_SECONDS)
  wait?: number;

  @ApiPropertyOptional({ default: LISTEN_MESSAGES_DEFAULT_LIMIT, maximum: LISTEN_MESSAGES_MAX_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(LISTEN_MESSAGES_MAX_LIMIT)
  limit?: number;
}

/** Where the agent is listening: the computer holding the lease, the host it starts there, and until when. */
export class ListeningDto {
  @ApiProperty({ description: 'The computer holding the lease.' })
  computerId: string;

  @ApiProperty({ description: 'What the operator calls it: "MacBook".' })
  computerName: string;

  @ApiProperty({ enum: [...LISTEN_HOST_IDS], description: 'The host it starts there.' })
  host: ListenHostId;

  @ApiPropertyOptional({ description: 'The folder the host runs in: "~/projects/app".' })
  project?: string;

  @ApiProperty({ description: 'When this computer took the lease.' })
  since: string;

  @ApiProperty({ description: 'When it last renewed it.' })
  renewedAt: string;

  @ApiProperty({ description: 'When the lease lapses unless it is renewed again: 3 minutes after the last renewal.' })
  expiresAt: string;
}

export class ListenLeaseResponseDto {
  @ApiProperty({ type: ListeningDto })
  listening: ListeningDto;

  @ApiProperty({ description: 'Renew it this many seconds from now.' })
  renewInSeconds: number;
}

export class ListenLeaseStatusResponseDto {
  @ApiProperty({ type: ListeningDto, nullable: true, description: 'Null when no computer holds a live lease.' })
  listening: ListeningDto | null;

  @ApiProperty({
    description:
      'The operator paused the agent on agentinbox.md: no host takes the lease or waits until it is resumed.',
  })
  paused: boolean;
}

export class ReleaseListenLeaseResponseDto {
  @ApiProperty({ description: 'False when this computer and host didn’t hold a live lease. Another holder’s stays.' })
  released: boolean;
}

export class ListenMessageSenderDto {
  @ApiProperty({ description: 'The contact id: what `--to` takes.' })
  id: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiProperty({ description: 'Whether it is the operator.' })
  isOperator: boolean;
}

/** What a person picked or wrote in answer to a card. */
export class ListenAnswerDto {
  @ApiProperty({ description: 'What became of the card: `answered`, `approved` or `denied`.' })
  status: string;

  @ApiPropertyOptional({ description: 'The button pressed: `approve`, `deny`, an extra action, or the option picked.' })
  optionId?: string;

  @ApiPropertyOptional({ description: 'What they wrote, for a question answered in words.' })
  text?: string;
}

/** A message that may start a host: written by the operator, or by a contact the agent listens to. */
export class ListenMessageDto {
  @ApiProperty({ description: 'The message’s own id. It never changes, so a message is handled once.' })
  id: string;

  @ApiProperty({ description: 'The conversation it is in, as `inbox show` and `inbox reply` take it.' })
  conversationId: string;

  @ApiProperty({ description: 'As the inbox shows it: `telegram`, `slack`, `email`.' })
  channel: string;

  @ApiProperty({ type: ListenMessageSenderDto })
  from: ListenMessageSenderDto;

  @ApiProperty({ description: 'What they wrote. For a pressed button, what the button says.' })
  text: string;

  @ApiProperty({ description: 'When it arrived.' })
  at: string;

  @ApiPropertyOptional({
    description: 'Set when it answers a question the agent sent: that question’s id (the interaction id).',
  })
  answersMessageId?: string;

  @ApiProperty({
    description:
      'How many times the conversation was resolved before this message, 0 if never: a host keeps one session for each conversation and round.',
  })
  round: number;

  @ApiProperty({ description: 'Whether the conversation is a direct chat, not a group or a channel.' })
  isDirectMessage: boolean;

  @ApiPropertyOptional({ type: ListenAnswerDto, description: 'With `answersMessageId`: what was picked or written.' })
  answer?: ListenAnswerDto;

  @ApiPropertyOptional({
    description: 'What came with it, as the inbox shows it: each file’s type, name, kind and size.',
  })
  attachments?: InboxAttachmentDto[];
}

export class ListenMessagesResponseDto {
  @ApiProperty({ type: [ListenMessageDto], description: 'Oldest first.' })
  data: ListenMessageDto[];

  @ApiProperty({ description: 'Always set: pass it as `after` next time.' })
  next: string;
}
