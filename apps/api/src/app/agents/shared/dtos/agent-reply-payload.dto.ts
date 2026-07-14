import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import type { TriggerRecipientsPayload } from '@novu/shared';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
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
import { FileRefDto } from './file-ref.dto';

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
  validate(signal: MetadataSignalDto | TriggerSignalDto): boolean {
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

    const fields = [content.markdown, content.card, content.toolApprovalCard].filter((v) => v !== undefined);
    if (fields.length !== 1) return false;

    if (content.files?.length && !content.markdown && !content.card && !content.toolApprovalCard) return false;
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
      'Content must have exactly one of markdown, card, or toolApprovalCard. Files require one of them. ' +
      `At most ${MAX_FILES_PER_MESSAGE} files are allowed. Each file needs exactly one of data or url. ` +
      'Inline data must be 5 MB or smaller.'
    );
  }
}

@ValidatorConstraint({ name: 'isValidTypingOp', async: false })
export class IsValidTypingOp implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === undefined) return true;
    if (value === 'stop') return true;

    if (typeof value === 'object' && value !== null) {
      const status = (value as { status?: unknown }).status;

      return status === undefined || typeof status === 'string';
    }

    return false;
  }

  defaultMessage(): string {
    return "typing must be 'stop' or an object with an optional string status.";
  }
}

export class ToolApprovalCardDto {
  @ApiProperty({
    enum: ['tool-approval-card'],
    description: 'Discriminator for Novu tool-approval cards.',
    example: 'tool-approval-card',
  })
  @IsString()
  @IsIn(['tool-approval-card'])
  type: 'tool-approval-card';

  @ApiPropertyOptional({
    description: 'Slack-only catalog icon id, `https://` URL, or omit to auto-match the tool name.',
    example: 'stripe',
  })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({
    description: 'Card title shown on all channels.',
    example: 'Approve database search?',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Card subtitle; auto-generated from the tool name when omitted.',
    example: 'search_database',
  })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional({
    description: 'Slack-only optional markdown body (for example, argument preview).',
    example: 'Query: `SELECT * FROM users WHERE id = 42`',
  })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ description: 'Approve button label.', example: 'Approve' })
  @IsOptional()
  @IsString()
  approveLabel?: string;

  @ApiPropertyOptional({ description: 'Deny button label.', example: 'Deny' })
  @IsOptional()
  @IsString()
  denyLabel?: string;
}

@ApiExtraModels(FileRefDto, ToolApprovalCardDto)
export class ReplyContentDto {
  @ApiPropertyOptional({
    description: 'Plain text or markdown body for the reply.',
    example: '**Report generated.** See the attached PDF.',
  })
  @IsOptional()
  @IsString()
  markdown?: string;

  @ApiPropertyOptional({
    description:
      'Interactive card element tree (buttons, text blocks, and other chat-sdk primitives). ' +
      'Mutually exclusive with `markdown` and `toolApprovalCard`.',
    example: {
      type: 'card',
      title: 'Deploy status',
      subtitle: 'Production',
      children: [{ type: 'text', content: 'The latest deploy succeeded.' }],
    },
  })
  @IsOptional()
  @IsObject()
  card?: Record<string, unknown>;

  @ApiPropertyOptional({
    type: ToolApprovalCardDto,
    description: 'Novu tool-approval card rendered natively on supported channels.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ToolApprovalCardDto)
  toolApprovalCard?: ToolApprovalCardDto;

  @ApiPropertyOptional({
    type: [FileRefDto],
    description:
      'File attachments delivered alongside markdown or card content. Up to 15 files per message. ' +
      'Each file must provide exactly one of `data` or `url`.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileRefDto)
  files?: FileRefDto[];
}

export class ToolApprovalRequestPayloadDto {
  @ApiProperty({
    description: 'Unique id for this approval request (matches the AI SDK approvalId).',
    example: 'appr_123',
  })
  @IsString()
  @IsNotEmpty()
  approvalId: string;

  @ApiProperty({
    description: 'Id of the tool call awaiting approval.',
    example: 'tc_456',
  })
  @IsString()
  @IsNotEmpty()
  toolCallId: string;

  @ApiProperty({
    description: 'Name of the gated tool.',
    example: 'search_database',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Tool input the model proposed.',
    example: { query: 'SELECT * FROM users WHERE id = 42' },
  })
  @IsOptional()
  @IsObject()
  input?: Record<string, unknown>;
}

export class EditPayloadDto {
  @ApiProperty({
    description: 'Platform message id of the message to edit.',
    example: 'msg_01HXYZ',
  })
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
  @ApiPropertyOptional({
    description: 'Optional human-readable summary stored on the resolve signal.',
    example: 'Issue resolved — billing adjustment applied.',
  })
  @IsOptional()
  @IsString()
  summary?: string;
}

export class AddReactionPayloadDto {
  @ApiProperty({
    description: 'Platform message id to react to.',
    example: 'msg_01HXYZ',
  })
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @ApiProperty({
    description: 'Cross-platform emoji name (for example, `thumbs_up`, `check`).',
    example: 'thumbs_up',
  })
  @IsString()
  @IsNotEmpty()
  emojiName: string;
}

export class DeleteMessagePayloadDto {
  @ApiProperty({
    description: 'Platform message id to delete from the provider thread.',
    example: 'msg_01HXYZ',
  })
  @IsString()
  @IsNotEmpty()
  messageId: string;
}

export class MetadataSignalDto {
  @ApiProperty({ enum: ['metadata'], example: 'metadata' })
  @IsString()
  @IsIn(['metadata'])
  type: 'metadata';

  @ApiPropertyOptional({
    enum: METADATA_ACTIONS,
    description: 'Metadata mutation to apply. Defaults to `set`.',
    example: 'set',
  })
  @IsOptional()
  @IsString()
  @IsIn(METADATA_ACTIONS)
  action?: (typeof METADATA_ACTIONS)[number];

  @ApiPropertyOptional({
    description: 'Metadata key (1–128 chars; letters, digits, `-`, `_`, `:`). Required for `set` and `delete`.',
    example: 'sentiment',
  })
  @IsOptional()
  @IsString()
  key?: string;

  @ApiPropertyOptional({
    description: 'Value to store when `action` is `set`.',
    example: 'positive',
  })
  @IsOptional()
  value?: unknown;

  @ApiPropertyOptional({ description: 'Not used for metadata signals.', deprecated: true })
  @IsOptional()
  @IsString()
  workflowId?: string;

  @ApiPropertyOptional({ description: 'Not used for metadata signals.', deprecated: true })
  @IsOptional()
  @Validate(IsValidTriggerRecipient)
  to?: TriggerRecipientsPayload;

  @ApiPropertyOptional({ description: 'Not used for metadata signals.', deprecated: true })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

export class TriggerSignalDto {
  @ApiProperty({ enum: ['trigger'], example: 'trigger' })
  @IsString()
  @IsIn(['trigger'])
  type: 'trigger';

  @ApiPropertyOptional({ description: 'Not used for trigger signals.', deprecated: true })
  @IsOptional()
  @IsString()
  @IsIn(METADATA_ACTIONS)
  action?: (typeof METADATA_ACTIONS)[number];

  @ApiPropertyOptional({ description: 'Not used for trigger signals.', deprecated: true })
  @IsOptional()
  @IsString()
  key?: string;

  @ApiPropertyOptional({ description: 'Not used for trigger signals.', deprecated: true })
  @IsOptional()
  value?: unknown;

  @ApiProperty({
    description: 'Workflow identifier or slug to trigger.',
    example: 'escalation-email',
  })
  @IsString()
  @IsNotEmpty()
  workflowId: string;

  @ApiPropertyOptional({
    description:
      'Workflow recipients — subscriber id string, `{ subscriberId }` object, topic object, or an array of those.',
    example: 'subscriber-123',
  })
  @IsOptional()
  @Validate(IsValidTriggerRecipient)
  to?: TriggerRecipientsPayload;

  @ApiPropertyOptional({
    description: 'Workflow trigger payload.',
    example: { reason: 'User requested human support' },
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

export type SignalDto = MetadataSignalDto | TriggerSignalDto;

export class TypingStatusDto {
  @ApiPropertyOptional({
    description: 'Custom status text. Omit for the default "Thinking…".',
    example: 'Searching the docs…',
  })
  @IsOptional()
  @IsString()
  status?: string;
}

/**
 * Reports the outcome of a tool call back to Novu so it's saved in the conversation history.
 */
export class ToolResultDto {
  @ApiProperty({
    description: 'Id of the tool call this result resolves.',
    example: 'tc_456',
  })
  @IsString()
  @IsNotEmpty()
  toolCallId: string;

  @ApiPropertyOptional({
    description: 'Name of the tool that produced this result.',
    example: 'search_database',
  })
  @IsOptional()
  @IsString()
  toolName?: string;

  @ApiPropertyOptional({
    description: 'JSON-serializable tool output (or the execution-denied marker).',
    example: { rows: 3 },
  })
  @IsOptional()
  output?: unknown;

  @ApiPropertyOptional({
    description: 'Human-readable preview for the display timeline.',
    example: 'Found 3 matching rows',
  })
  @IsOptional()
  @IsString()
  preview?: string;
}

@ApiExtraModels(MetadataSignalDto, TriggerSignalDto, TypingStatusDto, ReplyContentDto, FileRefDto, ToolApprovalCardDto)
export class AgentReplyPayloadDto {
  @ApiProperty({
    description: 'Conversation id returned by inbound webhooks or the conversations API.',
    example: 'conv_abc123',
  })
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @ApiProperty({
    description: 'Integration identifier for the channel connection that owns the thread.',
    example: 'slack-prod',
  })
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

  @ApiPropertyOptional({
    type: ToolApprovalRequestPayloadDto,
    description: 'Tool-lifecycle ledger row for a gated tool call. Optional reply delivers the approval card.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ToolApprovalRequestPayloadDto)
  toolApprovalRequest?: ToolApprovalRequestPayloadDto;

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

  @ApiPropertyOptional({
    type: 'array',
    description: 'Side-effect signals applied during the turn (metadata updates or workflow triggers).',
    items: {
      oneOf: [{ $ref: getSchemaPath(MetadataSignalDto) }, { $ref: getSchemaPath(TriggerSignalDto) }],
      discriminator: {
        propertyName: 'type',
        mapping: {
          metadata: getSchemaPath(MetadataSignalDto),
          trigger: getSchemaPath(TriggerSignalDto),
        },
      },
    },
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Validate(IsValidSignal, { each: true })
  @Type(() => MetadataSignalDto, {
    discriminator: {
      property: 'type',
      subTypes: [
        { value: MetadataSignalDto, name: 'metadata' },
        { value: TriggerSignalDto, name: 'trigger' },
      ],
    },
    keepDiscriminatorProperty: true,
  })
  signals?: SignalDto[];

  @ApiPropertyOptional({ type: [ToolResultDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ToolResultDto)
  toolResults?: ToolResultDto[];

  @ApiPropertyOptional({ type: [AddReactionPayloadDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddReactionPayloadDto)
  addReactions?: AddReactionPayloadDto[];

  @ApiPropertyOptional({
    type: [DeleteMessagePayloadDto],
    description:
      'Delete previously posted platform messages. Removes the rendered message only — history is preserved.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeleteMessagePayloadDto)
  deleteMessages?: DeleteMessagePayloadDto[];

  @ApiPropertyOptional({
    description:
      'Per-turn typing/status control. `{ status?: string }` sets the status text ' +
      '(omit for the default "Thinking…"); `"stop"` clears it. Best-effort per platform.',
    oneOf: [{ $ref: getSchemaPath(TypingStatusDto) }, { type: 'string', enum: ['stop'] }],
    examples: [{ status: 'Searching the docs…' }, 'stop'],
  })
  @IsOptional()
  @Validate(IsValidTypingOp)
  typing?: TypingStatusDto | 'stop';

  @ApiPropertyOptional({
    description:
      'Bridge reports the turn failed on the customer runtime. Delivers generic user copy. ' +
      'Cannot be combined with any other request fields.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  error?: boolean;
}
