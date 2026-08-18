import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import type { TriggerRecipientsPayload } from '@novu/shared';
import type { CardElement } from 'chat';
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
 *
 * User-facing keys must start with an alphanumeric. The framework's own reserved
 * `__novu:` namespace (see {@link RESERVED_METADATA_NAMESPACE}) is exempt from the
 * leading-alphanumeric rule — its suffix is still validated by this same regex, so
 * prototype-pollution / storage-breaking chars stay rejected.
 */
const METADATA_SIGNAL_KEY_REGEX = /^[a-zA-Z0-9]+(?:[-_:][a-zA-Z0-9]+)*$/;
const FORBIDDEN_METADATA_SIGNAL_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_METADATA_SIGNAL_KEY_LENGTH = 128;

/**
 * Reserved prefix for framework-internal bookkeeping keys (e.g. the auth-card
 * tracking metadata written by the framework auth gate). These start with `__`,
 * which the user-facing key regex disallows, so they're validated by namespace
 * prefix + suffix rather than as a whole key.
 */
const RESERVED_METADATA_NAMESPACE = '__novu:';

export function isValidMetadataSignalKey(key: unknown): key is string {
  if (typeof key !== 'string' || key.length === 0 || key.length > MAX_METADATA_SIGNAL_KEY_LENGTH) {
    return false;
  }

  if (FORBIDDEN_METADATA_SIGNAL_KEYS.has(key)) return false;

  if (key.startsWith(RESERVED_METADATA_NAMESPACE)) {
    return METADATA_SIGNAL_KEY_REGEX.test(key.slice(RESERVED_METADATA_NAMESPACE.length));
  }

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
      'set requires a key 1-128 chars of letters, digits and "-", "_", ":" separators (or a framework-reserved ' +
      '"__novu:" namespaced key) plus a defined value; ' +
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

    if (content.markdown !== undefined) {
      if (typeof content.markdown !== 'string' || content.markdown.trim().length === 0) {
        return false;
      }
    }

    if (content.card !== undefined) {
      if (
        content.card === null ||
        typeof content.card !== 'object' ||
        (content.card as { type?: unknown }).type !== 'card'
      ) {
        return false;
      }
    }

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
      'Content must have exactly one of markdown, card, or toolApprovalCard. Markdown cannot be empty. ' +
      'Card must be a Chat SDK card element (`type: "card"`). Files require one of them. ' +
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

/**
 * File attachment reference. Provide exactly one of `data` or `url`.
 */
export class FileRefDto {
  @ApiProperty({
    description: 'Filename shown to the end user, including extension.',
    example: 'report.pdf',
  })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiPropertyOptional({
    description: 'IANA MIME type of the file.',
    example: 'application/pdf',
  })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({
    description:
      'Base64-encoded inline file bytes. Mutually exclusive with `url`. Decoded size must be ≤ 5 MB. Prefer `url` for larger files.',
    example: 'JVBERi0xLjQK...',
  })
  @IsOptional()
  @IsString()
  data?: string;

  @ApiPropertyOptional({
    description:
      'Publicly accessible HTTP(S) URL. Mutually exclusive with `data`. Server-side limits: 25 MB per file, 15 files per message, 50 MB aggregate.',
    example: 'https://example.com/files/report.pdf',
  })
  @IsOptional()
  @IsString()
  url?: string;
}

/**
 * OpenAPI shape: markdown reply content. Exactly one of markdown / card / toolApprovalCard on the wire.
 */
export class MarkdownReplyContentDto {
  @ApiProperty({
    description: 'Plain text or markdown body. Converted to the platform-native format by Novu.',
    example: '**Report ready.** Your weekly summary is attached.',
  })
  markdown: string;

  @ApiPropertyOptional({
    type: [FileRefDto],
    description: `Optional attachments (max ${MAX_FILES_PER_MESSAGE}). Each file needs exactly one of data or url.`,
  })
  files?: FileRefDto[];
}

/**
 * OpenAPI shape: interactive card reply (Chat SDK card JSON tree).
 */
export class CardReplyContentDto {
  @ApiProperty({
    description:
      'Interactive card as a Chat SDK element tree (`type: "card"`). Prefer building with `@novu/framework` Card helpers when using TypeScript.',
    type: 'object',
    additionalProperties: true,
    example: {
      type: 'card',
      title: 'Order #123',
      children: [
        { type: 'text', content: 'Your order is ready for pickup.' },
        { type: 'button', id: 'confirm', label: 'Confirm', style: 'primary' },
      ],
    },
  })
  card: CardElement;

  @ApiPropertyOptional({
    type: [FileRefDto],
    description: `Optional attachments (max ${MAX_FILES_PER_MESSAGE}). Supported alongside cards on platforms that allow it (e.g. WhatsApp).`,
  })
  files?: FileRefDto[];
}

/**
 * OpenAPI shape: built-in tool-approval card presentation.
 */
export class ToolApprovalCardReplyContentDto {
  @ApiProperty({
    description:
      'Novu tool-approval card descriptor (`type: "tool-approval-card"`). Used with `toolApprovalRequest` to render Approve/Deny UI.',
    type: 'object',
    additionalProperties: true,
    example: {
      type: 'tool-approval-card',
      title: 'Approve refund?',
      subtitle: 'issue_refund · ORD-42 · $25.00',
      approveLabel: 'Approve',
      denyLabel: 'Deny',
    },
  })
  toolApprovalCard: Record<string, unknown>;

  @ApiPropertyOptional({ type: [FileRefDto] })
  files?: FileRefDto[];
}

@ApiExtraModels(FileRefDto, MarkdownReplyContentDto, CardReplyContentDto, ToolApprovalCardReplyContentDto)
export class ReplyContentDto {
  @ApiPropertyOptional({
    description: 'Plain text or markdown body. Mutually exclusive with `card` and `toolApprovalCard`.',
    example: 'Hello! How can I help?',
  })
  @IsOptional()
  @IsString()
  markdown?: string;

  @ApiPropertyOptional({
    description: 'Interactive Chat SDK card JSON. Mutually exclusive with `markdown` and `toolApprovalCard`.',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  card?: CardElement;

  @ApiPropertyOptional({
    description: 'Built-in tool-approval card. Mutually exclusive with `markdown` and `card`.',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  toolApprovalCard?: Record<string, unknown>;

  @ApiPropertyOptional({
    type: [FileRefDto],
    description: `Optional file attachments (max ${MAX_FILES_PER_MESSAGE}). Requires markdown, card, or toolApprovalCard.`,
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
    example: 'apr_01HZX',
  })
  @IsString()
  @IsNotEmpty()
  approvalId: string;

  @ApiProperty({
    description: 'Id of the tool call awaiting approval.',
    example: 'call_refund_1',
  })
  @IsString()
  @IsNotEmpty()
  toolCallId: string;

  @ApiProperty({
    description: 'Name of the gated tool.',
    example: 'issue_refund',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Tool input the model proposed.',
    type: 'object',
    additionalProperties: true,
    example: { orderId: 'ORD-42', amountCents: 2500 },
  })
  @IsOptional()
  @IsObject()
  input?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Server-minted approve action id. When omitted, self-hosted tool-approval:* is minted at persist.',
    example: 'tool-approval:approve:apr_01HZX',
  })
  @IsOptional()
  @IsString()
  approveActionId?: string;

  @ApiPropertyOptional({
    description: 'Server-minted deny action id. When omitted, self-hosted tool-approval:* is minted at persist.',
    example: 'tool-approval:deny:apr_01HZX',
  })
  @IsOptional()
  @IsString()
  denyActionId?: string;

  @ApiPropertyOptional({
    description: 'MCP server name when the gated tool is from an MCP server (for UI labels).',
    example: 'GitHub',
  })
  @IsOptional()
  @IsString()
  mcpServerName?: string;
}

@ApiExtraModels(MarkdownReplyContentDto, CardReplyContentDto, ToolApprovalCardReplyContentDto, FileRefDto)
export class EditPayloadDto {
  @ApiProperty({
    description: 'Platform message id of the message to edit.',
    example: '1712345678.123456',
  })
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @ApiProperty({
    description: 'Replacement content. Exactly one of markdown, card, or toolApprovalCard.',
    oneOf: [
      { $ref: getSchemaPath(MarkdownReplyContentDto) },
      { $ref: getSchemaPath(CardReplyContentDto) },
      { $ref: getSchemaPath(ToolApprovalCardReplyContentDto) },
    ],
  })
  @IsObject()
  @ValidateNested()
  @Validate(IsValidReplyContent)
  @Type(() => ReplyContentDto)
  content: MarkdownReplyContentDto | CardReplyContentDto | ToolApprovalCardReplyContentDto;
}

export class ResolveDto {
  @ApiPropertyOptional({
    description: 'Optional human-readable resolution summary stored on the conversation.',
    example: 'Answered billing question about invoice INV-42.',
  })
  @IsOptional()
  @IsString()
  summary?: string;
}

export class AddReactionPayloadDto {
  @ApiProperty({
    description: 'Platform message id to react to.',
    example: '1712345678.123456',
  })
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @ApiProperty({
    description: 'Well-known cross-platform emoji name (e.g. `white_check_mark`, `thumbsup`).',
    example: 'white_check_mark',
  })
  @IsString()
  @IsNotEmpty()
  emojiName: string;
}

export class DeleteMessagePayloadDto {
  @ApiProperty({
    description: 'Platform message id to delete. Removes the rendered message only — history is preserved.',
    example: '1712345678.123456',
  })
  @IsString()
  @IsNotEmpty()
  messageId: string;
}

/** OpenAPI: set a metadata key. */
export class MetadataSetSignalDto {
  @ApiProperty({ enum: ['metadata'] })
  type: 'metadata';

  @ApiPropertyOptional({
    enum: ['set'],
    description: 'Defaults to `set` when omitted.',
    default: 'set',
  })
  action?: 'set';

  @ApiProperty({
    description: 'Metadata key (1–128 chars; letters, digits, and `-` `_` `:` separators).',
    example: 'crm:ticketId',
  })
  key: string;

  @ApiProperty({
    description: 'JSON-serializable value to store.',
    example: 'TCK-1001',
  })
  value: unknown;
}

/** OpenAPI: delete a metadata key. */
export class MetadataDeleteSignalDto {
  @ApiProperty({ enum: ['metadata'] })
  type: 'metadata';

  @ApiProperty({ enum: ['delete'] })
  action: 'delete';

  @ApiProperty({
    description: 'Metadata key to remove.',
    example: 'crm:ticketId',
  })
  key: string;
}

/** OpenAPI: clear all conversation metadata. */
export class MetadataClearSignalDto {
  @ApiProperty({ enum: ['metadata'] })
  type: 'metadata';

  @ApiProperty({ enum: ['clear'] })
  action: 'clear';
}

/** OpenAPI: trigger a Novu workflow from the agent turn. */
export class TriggerSignalDto {
  @ApiProperty({ enum: ['trigger'] })
  type: 'trigger';

  @ApiProperty({
    description: 'Workflow identifier (same string used with `events.trigger`).',
    example: 'order-shipped',
  })
  workflowId: string;

  @ApiPropertyOptional({
    description:
      'Recipient(s). Accepts a subscriberId string, subscriber object, topic object, or an array of those. When omitted, Novu falls back to the conversation subscriber.',
    oneOf: [
      { type: 'string', example: 'subscriber-123' },
      {
        type: 'object',
        additionalProperties: true,
        example: { subscriberId: 'subscriber-123' },
      },
      {
        type: 'array',
        items: {
          oneOf: [{ type: 'string' }, { type: 'object', additionalProperties: true }],
        },
      },
    ],
  })
  to?: TriggerRecipientsPayload;

  @ApiPropertyOptional({
    description: 'Arbitrary payload forwarded to the workflow.',
    type: 'object',
    additionalProperties: true,
    example: { orderId: 'ORD-42' },
  })
  payload?: Record<string, unknown>;
}

@ApiExtraModels(MetadataSetSignalDto, MetadataDeleteSignalDto, MetadataClearSignalDto, TriggerSignalDto)
export class SignalDto {
  @ApiProperty({
    enum: SIGNAL_TYPES,
    description: '`metadata` updates conversation state; `trigger` fires a Novu workflow.',
  })
  @IsString()
  @IsIn(SIGNAL_TYPES)
  type: (typeof SIGNAL_TYPES)[number];

  @ApiPropertyOptional({
    enum: METADATA_ACTIONS,
    description: 'Required for metadata signals other than the default `set`.',
  })
  @IsOptional()
  @IsString()
  @IsIn(METADATA_ACTIONS)
  action?: (typeof METADATA_ACTIONS)[number];

  @ApiPropertyOptional({
    description: 'Metadata key for `set` / `delete` actions.',
    example: 'crm:ticketId',
  })
  @IsOptional()
  @IsString()
  key?: string;

  @ApiPropertyOptional({
    description: 'Value for metadata `set` actions. JSON-serializable.',
  })
  @IsOptional()
  value?: unknown;

  @ApiPropertyOptional({
    description: 'Workflow identifier for `trigger` signals.',
    example: 'order-shipped',
  })
  @IsOptional()
  @IsString()
  workflowId?: string;

  @ApiPropertyOptional({
    description:
      'Trigger recipients. SubscriberId string, subscriber/topic object, or array. Falls back to the conversation subscriber when omitted.',
    oneOf: [
      { type: 'string', example: 'subscriber-123' },
      { type: 'object', additionalProperties: true },
      {
        type: 'array',
        items: {
          oneOf: [{ type: 'string' }, { type: 'object', additionalProperties: true }],
        },
      },
    ],
  })
  @IsOptional()
  @Validate(IsValidTriggerRecipient)
  to?: TriggerRecipientsPayload;

  @ApiPropertyOptional({
    description: 'Workflow payload for `trigger` signals.',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

/**
 * Reports the outcome of a tool call back to Novu so it's saved in the conversation history.
 */
export class ToolResultDto {
  @ApiProperty({
    description: 'Id of the tool call this result resolves.',
    example: 'call_abc123',
  })
  @IsString()
  @IsNotEmpty()
  toolCallId: string;

  @ApiPropertyOptional({
    description: 'Name of the tool that produced this result.',
    example: 'lookup_order',
  })
  @IsOptional()
  @IsString()
  toolName?: string;

  @ApiPropertyOptional({
    description: 'JSON-serializable tool output (or the execution-denied marker).',
  })
  @IsOptional()
  output?: unknown;

  @ApiPropertyOptional({
    description: 'Human-readable preview for the display timeline.',
    example: 'Order ORD-42 is shipped',
  })
  @IsOptional()
  @IsString()
  preview?: string;
}

/** OpenAPI: typing status object (`{ status?: string }`). */
export class TypingStatusDto {
  @ApiPropertyOptional({
    description: 'Status text shown while the agent works. Omit for the default "Thinking…".',
    example: 'Looking up your order…',
  })
  @IsOptional()
  @IsString()
  status?: string;
}

@ApiExtraModels(
  FileRefDto,
  MarkdownReplyContentDto,
  CardReplyContentDto,
  ToolApprovalCardReplyContentDto,
  ToolApprovalRequestPayloadDto,
  EditPayloadDto,
  ResolveDto,
  SignalDto,
  MetadataSetSignalDto,
  MetadataDeleteSignalDto,
  MetadataClearSignalDto,
  TriggerSignalDto,
  ToolResultDto,
  AddReactionPayloadDto,
  DeleteMessagePayloadDto,
  TypingStatusDto
)
export class AgentReplyPayloadDto {
  @ApiProperty({
    description: 'Conversation id to reply into. Obtained from the inbound agent event / bridge payload.',
    example: '64f5a1c2e8b7a3d9f0c1b2a3',
  })
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @ApiProperty({
    description: 'Channel integration identifier linked to the agent for this conversation (e.g. `slack-support`).',
    example: 'slack-support',
  })
  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;

  @ApiPropertyOptional({
    description:
      'Outbound message content. Exactly one of `markdown`, `card`, or `toolApprovalCard`. Optional `files` attach to the message. Cannot be combined with `edit`.',
    oneOf: [
      { $ref: getSchemaPath(MarkdownReplyContentDto) },
      { $ref: getSchemaPath(CardReplyContentDto) },
      { $ref: getSchemaPath(ToolApprovalCardReplyContentDto) },
    ],
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Validate(IsValidReplyContent)
  @Type(() => ReplyContentDto)
  reply?: MarkdownReplyContentDto | CardReplyContentDto | ToolApprovalCardReplyContentDto;

  @ApiPropertyOptional({
    type: ToolApprovalRequestPayloadDto,
    description:
      'Tool-lifecycle ledger row for a gated tool call. Pair with `reply.toolApprovalCard` (or another reply shape) to deliver the approval UI.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ToolApprovalRequestPayloadDto)
  toolApprovalRequest?: ToolApprovalRequestPayloadDto;

  @ApiPropertyOptional({
    type: EditPayloadDto,
    description:
      'In-place edit of a previously posted agent message. Cannot be combined with reply, resolve, signals, toolResults, toolApprovalRequest, addReactions, or deleteMessages.',
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => EditPayloadDto)
  edit?: EditPayloadDto;

  @ApiPropertyOptional({
    type: ResolveDto,
    description: 'Mark the conversation resolved. May be combined with a final `reply`.',
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ResolveDto)
  resolve?: ResolveDto;

  @ApiPropertyOptional({
    description:
      'Side-effect signals executed during this turn: conversation metadata mutations or Novu workflow triggers.',
    type: 'array',
    items: {
      oneOf: [
        { $ref: getSchemaPath(MetadataSetSignalDto) },
        { $ref: getSchemaPath(MetadataDeleteSignalDto) },
        { $ref: getSchemaPath(MetadataClearSignalDto) },
        { $ref: getSchemaPath(TriggerSignalDto) },
      ],
    },
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Validate(IsValidSignal, { each: true })
  @Type(() => SignalDto)
  signals?: Array<MetadataSetSignalDto | MetadataDeleteSignalDto | MetadataClearSignalDto | TriggerSignalDto>;

  @ApiPropertyOptional({
    type: [ToolResultDto],
    description: 'Tool-call outcomes to persist in conversation history (typically before the assistant reply).',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ToolResultDto)
  toolResults?: ToolResultDto[];

  @ApiPropertyOptional({
    type: [AddReactionPayloadDto],
    description: 'Emoji reactions to add to existing platform messages.',
  })
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
      'Per-turn typing/status control. Pass `{ status?: string }` to set/update the status (omit `status` for "Thinking…"), or `"stop"` to clear it. Best-effort per platform.',
    oneOf: [
      { type: 'string', enum: ['stop'], description: 'Clear the typing indicator.' },
      { $ref: getSchemaPath(TypingStatusDto) },
    ],
    example: { status: 'Looking up your order…' },
  })
  @IsOptional()
  @Validate(IsValidTypingOp)
  typing?: TypingStatusDto | 'stop';

  @ApiPropertyOptional({
    description:
      'Bridge reports that the customer runtime failed this turn. Cannot be combined with other actions. Novu delivers generic user-facing error copy.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  error?: boolean;
}
