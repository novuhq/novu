import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { FileRef } from '@novu/framework';
import type { TriggerRecipientsPayload } from '@novu/shared';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Validate,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export type { FileRef } from '@novu/framework';

const SIGNAL_TYPES = ['metadata', 'trigger'] as const;
const METADATA_ACTIONS = ['set', 'delete', 'clear'] as const;
const MAX_INLINE_FILE_BASE64_CHARS = 7_000_000;
const MAX_FILES_PER_MESSAGE = 15;

/**
 * Allowed characters for a metadata signal key.
 *
 * Metadata is merged into `conversation.metadata` (a plain object) and re-hydrated by
 * every downstream consumer, so we forbid anything that could produce a prototype
 * pollution gadget (`__proto__`, `constructor`, `prototype`) or break key handling
 * for storage/serialization (dots, brackets, control chars). The shape mirrors
 * SLUG_IDENTIFIER_REGEX with an additional `:` for namespacing (e.g. `crm:ticketId`).
 */
const METADATA_SIGNAL_KEY_REGEX = /^[a-zA-Z0-9]+(?:[-_:][a-zA-Z0-9]+)*$/;
const FORBIDDEN_METADATA_SIGNAL_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_METADATA_SIGNAL_KEY_LENGTH = 128;

export function isValidMetadataSignalKey(key: unknown): key is string {
  if (typeof key !== 'string' || key.length === 0 || key.length > MAX_METADATA_SIGNAL_KEY_LENGTH) {
    return false;
  }

  if (FORBIDDEN_METADATA_SIGNAL_KEYS.has(key)) return false;

  return METADATA_SIGNAL_KEY_REGEX.test(key);
}

@ValidatorConstraint({ name: 'isValidTriggerRecipient', async: false })
export class IsValidTriggerRecipient implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === undefined || value === null) return true;

    if (typeof value === 'string') return value.length > 0;

    if (Array.isArray(value)) {
      return value.length > 0 && value.every((item) => this.isRecipientItem(item));
    }

    return this.isSubscriberObject(value);
  }

  private isRecipientItem(item: unknown): boolean {
    if (typeof item === 'string') return item.length > 0;
    if (typeof item === 'object' && item !== null) {
      return this.isSubscriberObject(item) || this.isTopicObject(item);
    }

    return false;
  }

  private isSubscriberObject(obj: unknown): boolean {
    if (typeof obj !== 'object' || obj === null) return false;
    const subscriberId = (obj as { subscriberId?: unknown }).subscriberId;

    return typeof subscriberId === 'string' && subscriberId.trim().length > 0;
  }

  private isTopicObject(obj: unknown): boolean {
    if (typeof obj !== 'object' || obj === null) return false;
    const { type, topicKey } = obj as { type?: unknown; topicKey?: unknown };

    return typeof type === 'string' && type.length > 0 && typeof topicKey === 'string' && topicKey.length > 0;
  }

  defaultMessage(): string {
    return 'to must be a subscriberId string, a subscriber object with subscriberId, a topic object, or an array of those.';
  }
}

@ValidatorConstraint({ name: 'isValidSignal', async: false })
export class IsValidSignal implements ValidatorConstraintInterface {
  validate(signal: SignalDto): boolean {
    if (!signal?.type) return false;

    if (signal.type === 'metadata') {
      const action = signal.action ?? 'set';
      if (action === 'set') return isValidMetadataSignalKey(signal.key) && signal.value !== undefined;
      if (action === 'delete') return isValidMetadataSignalKey(signal.key);
      if (action === 'clear') return true;

      return false;
    }

    if (signal.type === 'trigger') {
      return typeof signal.workflowId === 'string' && signal.workflowId.length > 0;
    }

    return false;
  }

  defaultMessage(): string {
    return (
      'metadata signals require action (set|delete|clear): ' +
      'set requires a key 1-128 chars of letters, digits and "-", "_", ":" separators plus a defined value; ' +
      'delete requires a valid key; clear requires no additional fields; ' +
      'trigger signals require workflowId.'
    );
  }
}

@ValidatorConstraint({ name: 'isValidReplyContent', async: false })
export class IsValidReplyContent implements ValidatorConstraintInterface {
  validate(content: ReplyContentDto): boolean {
    if (!content) return true;

    const fields = [content.markdown, content.card].filter((v) => v !== undefined);
    if (fields.length !== 1) return false;

    if (content.files?.length && !content.markdown && !content.card) return false;
    if ((content.files?.length ?? 0) > MAX_FILES_PER_MESSAGE) return false;

    for (const file of content.files ?? []) {
      const sources = [file.data, file.url].filter(Boolean);
      if (sources.length !== 1) return false;
      if (typeof file.data === 'string' && file.data.replace(/\s/g, '').length > MAX_INLINE_FILE_BASE64_CHARS) {
        return false;
      }
    }

    return true;
  }

  defaultMessage(): string {
    return (
      'Content must have exactly one of markdown or card. Files require markdown or card. ' +
      `At most ${MAX_FILES_PER_MESSAGE} files are allowed. Each file needs exactly one of data or url. ` +
      'Inline data must be 5 MB or smaller.'
    );
  }
}

export class ReplyContentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  markdown?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  card?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  files?: FileRef[];
}

export class EditPayloadDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @ApiProperty({ type: ReplyContentDto })
  @IsObject()
  @ValidateNested()
  @Validate(IsValidReplyContent)
  @Type(() => ReplyContentDto)
  content: ReplyContentDto;
}

export class ResolveDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;
}

export class AddReactionPayloadDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  emojiName: string;
}

export class SignalDto {
  @ApiProperty({ enum: SIGNAL_TYPES })
  @IsString()
  @IsIn(SIGNAL_TYPES)
  type: (typeof SIGNAL_TYPES)[number];

  @ApiPropertyOptional({ enum: METADATA_ACTIONS })
  @IsOptional()
  @IsString()
  @IsIn(METADATA_ACTIONS)
  action?: (typeof METADATA_ACTIONS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  key?: string;

  @ApiPropertyOptional()
  @IsOptional()
  value?: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workflowId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Validate(IsValidTriggerRecipient)
  to?: TriggerRecipientsPayload;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

export class AgentReplyPayloadDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;

  @ApiPropertyOptional({ type: ReplyContentDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Validate(IsValidReplyContent)
  @Type(() => ReplyContentDto)
  reply?: ReplyContentDto;

  @ApiPropertyOptional({ type: EditPayloadDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => EditPayloadDto)
  edit?: EditPayloadDto;

  @ApiPropertyOptional({ type: ResolveDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ResolveDto)
  resolve?: ResolveDto;

  @ApiPropertyOptional({ type: [SignalDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Validate(IsValidSignal, { each: true })
  @Type(() => SignalDto)
  signals?: SignalDto[];

  @ApiPropertyOptional({ type: [AddReactionPayloadDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddReactionPayloadDto)
  addReactions?: AddReactionPayloadDto[];
}
