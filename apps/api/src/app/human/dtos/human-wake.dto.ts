import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WAKE_HOST_IDS, type WakeHostId } from '@novu/dal';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { HumanAgentQueryDto } from './human-agent.dto';
import { HUMAN_INBOX_MAX_WAIT_SECONDS, type InboxAttachmentDto } from './human-inbox.dto';
import { trimmed } from './setup-human-relay.dto';

/** The id `agentinbox wake` makes for a computer the first time it runs there, and keeps in its config. */
export const WAKE_COMPUTER_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

export const WAKE_COMPUTER_NAME_MAX_LENGTH = 64;

export const WAKE_PROJECT_MAX_LENGTH = 200;

export const WAKE_MESSAGES_DEFAULT_LIMIT = 20;

export const WAKE_MESSAGES_MAX_LIMIT = 50;

/** An opaque cursor is short; anything much longer is not one of ours. */
const WAKE_CURSOR_MAX_LENGTH = 256;

/** Who asks: a computer and the host it wakes there. Together they are the lease's holder. */
class WakeHolderDto extends HumanAgentQueryDto {
  @ApiProperty({
    description: 'The computer asking: the random id `agentinbox wake` keeps for it, of `[A-Za-z0-9_-]`.',
    minLength: 16,
    maxLength: 64,
  })
  @IsString()
  @Matches(WAKE_COMPUTER_ID_PATTERN)
  computerId: string;

  @ApiProperty({
    enum: [...WAKE_HOST_IDS],
    description:
      'The host it wakes there. Chat apps are never woken. The same computer with another host is another holder.',
  })
  @IsIn(WAKE_HOST_IDS)
  host: WakeHostId;
}

export class TakeWakeLeaseRequestDto extends WakeHolderDto {
  @ApiProperty({
    description: 'What the operator calls this computer, as the dashboard shows it: "MacBook".',
    maxLength: WAKE_COMPUTER_NAME_MAX_LENGTH,
  })
  // Trimmed, so a name of spaces counts as none.
  @Transform(trimmed)
  @IsString()
  @MinLength(1)
  @MaxLength(WAKE_COMPUTER_NAME_MAX_LENGTH)
  computerName: string;

  @ApiPropertyOptional({
    description: 'The folder the host runs in, as the operator reads it: "~/projects/app".',
    maxLength: WAKE_PROJECT_MAX_LENGTH,
  })
  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(WAKE_PROJECT_MAX_LENGTH)
  project?: string;

  @ApiPropertyOptional({
    description:
      'Take the lease from whoever holds it. Without it, another holder’s live lease answers 409 `awake_elsewhere`.',
  })
  @IsOptional()
  @IsBoolean()
  takeOver?: boolean;
}

export class ReleaseWakeLeaseRequestDto extends WakeHolderDto {}

export class WakeMessagesQueryDto extends WakeHolderDto {
  @ApiPropertyOptional({ description: 'The `next` of the last answer. Without it, only messages from now on count.' })
  @IsOptional()
  @IsString()
  @MaxLength(WAKE_CURSOR_MAX_LENGTH)
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

  @ApiPropertyOptional({ default: WAKE_MESSAGES_DEFAULT_LIMIT, maximum: WAKE_MESSAGES_MAX_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(WAKE_MESSAGES_MAX_LIMIT)
  limit?: number;
}

/** Where the agent is awake: the computer holding the lease, the host it wakes there, and until when. */
export class AwakeDto {
  @ApiProperty({ description: 'The computer holding the lease.' })
  computerId: string;

  @ApiProperty({ description: 'What the operator calls it: "MacBook".' })
  computerName: string;

  @ApiProperty({ enum: [...WAKE_HOST_IDS], description: 'The host it wakes there.' })
  host: WakeHostId;

  @ApiPropertyOptional({ description: 'The folder the host runs in: "~/projects/app".' })
  project?: string;

  @ApiProperty({ description: 'When this computer took the lease.' })
  since: string;

  @ApiProperty({ description: 'When it last renewed it.' })
  renewedAt: string;

  @ApiProperty({ description: 'When the lease lapses unless it is renewed again: 3 minutes after the last renewal.' })
  expiresAt: string;
}

export class WakeLeaseResponseDto {
  @ApiProperty({ type: AwakeDto })
  awake: AwakeDto;

  @ApiProperty({ description: 'Renew it this many seconds from now.' })
  renewInSeconds: number;
}

export class WakeLeaseStatusResponseDto {
  @ApiProperty({ type: AwakeDto, nullable: true, description: 'Null when no computer holds a live lease.' })
  awake: AwakeDto | null;

  @ApiProperty({
    description:
      'The operator paused the agent on agentinbox.md: no host takes the lease or waits until it is resumed.',
  })
  paused: boolean;
}

export class ReleaseWakeLeaseResponseDto {
  @ApiProperty({ description: 'False when this computer and host didn’t hold a live lease. Another holder’s stays.' })
  released: boolean;
}

export class WakeMessageSenderDto {
  @ApiProperty({ description: 'The contact id: what `--to` takes.' })
  id: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiProperty({ description: 'Whether it is the operator.' })
  isOperator: boolean;
}

/** What a person picked or wrote in answer to a card. */
export class WakeAnswerDto {
  @ApiProperty({ description: 'What became of the card: `answered`, `approved` or `denied`.' })
  status: string;

  @ApiPropertyOptional({ description: 'The button pressed: `approve`, `deny`, an extra action, or the option picked.' })
  optionId?: string;

  @ApiPropertyOptional({ description: 'What they wrote, for a question answered in words.' })
  text?: string;
}

/** A message that may wake a host: written by the operator, or by a contact allowed to wake one. */
export class WakeMessageDto {
  @ApiProperty({ description: 'The message’s own id. It never changes, so a message is handled once.' })
  id: string;

  @ApiProperty({ description: 'The conversation it is in, as `inbox show` and `inbox reply` take it.' })
  conversationId: string;

  @ApiProperty({ description: 'As the inbox shows it: `telegram`, `slack`, `email`.' })
  channel: string;

  @ApiProperty({ type: WakeMessageSenderDto })
  from: WakeMessageSenderDto;

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

  @ApiPropertyOptional({ type: WakeAnswerDto, description: 'With `answersMessageId`: what was picked or written.' })
  answer?: WakeAnswerDto;

  @ApiPropertyOptional({
    description: 'What came with it, as the inbox shows it: each file’s type, name, kind and size.',
  })
  attachments?: InboxAttachmentDto[];
}

export class ListWakeMessagesResponseDto {
  @ApiProperty({ type: [WakeMessageDto], description: 'Oldest first.' })
  data: WakeMessageDto[];

  @ApiProperty({ description: 'Always set: pass it as `after` next time.' })
  next: string;
}
