import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { FileRef } from '@novu/framework';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Validate,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export type { FileRef } from '@novu/framework';

const SIGNAL_TYPES = ['metadata', 'trigger'] as const;

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

@ValidatorConstraint({ name: 'isValidSignal', async: false })
export class IsValidSignal implements ValidatorConstraintInterface {
  validate(signal: SignalDto): boolean {
    if (!signal?.type) return false;

    if (signal.type === 'metadata') {
      return isValidMetadataSignalKey(signal.key) && signal.value !== undefined;
    }

    if (signal.type === 'trigger') {
      return typeof signal.workflowId === 'string' && signal.workflowId.length > 0;
    }

    return false;
  }

  defaultMessage(): string {
    return (
      'metadata signals require a key 1-128 chars of letters, digits and "-", "_", ":" separators ' +
      '(no leading, trailing or consecutive separators) plus a defined value; ' +
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

    if (content.files?.length && !content.markdown) return false;

    for (const file of content.files ?? []) {
      const sources = [file.data, file.url].filter(Boolean);
      if (sources.length !== 1) return false;
    }

    return true;
  }

  defaultMessage(): string {
    return 'Content must have exactly one of markdown or card. Files only allowed with markdown. Each file needs exactly one of data or url.';
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
  @IsString()
  to?: string;

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
