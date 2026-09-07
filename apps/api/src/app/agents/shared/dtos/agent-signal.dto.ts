import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  HUMAN_INTERACTION_MAX_RECIPIENTS,
  HUMAN_INTERACTION_MAX_TTL_SECONDS,
  type TriggerRecipientsPayload,
} from '@novu/shared';
import { type ClassConstructor, plainToInstance } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  IsDefined,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  Validate,
  ValidateIf,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { IsValidHumanTo } from '../../../human/validators/is-valid-human-to';

const SIGNAL_TYPES = ['metadata', 'trigger', 'human'] as const;
const HUMAN_SIGNAL_KINDS = ['ask', 'approve', 'choose', 'tell'] as const;

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

@ValidatorConstraint({ name: 'isValidMetadataSignalKey', async: false })
class IsValidMetadataSignalKey implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return isValidMetadataSignalKey(value);
  }

  defaultMessage(): string {
    return (
      'metadata key must be 1-128 chars of letters, digits and "-", "_", ":" separators ' +
      '(or a framework-reserved "__novu:" namespaced key)'
    );
  }
}

/** OpenAPI: set a metadata key. */
export class MetadataSetSignalDto {
  @ApiProperty({ enum: ['metadata'] })
  @Equals('metadata')
  type: 'metadata';

  @ApiPropertyOptional({
    enum: ['set'],
    description: 'Defaults to `set` when omitted.',
    default: 'set',
  })
  @IsOptional()
  @Equals('set')
  action?: 'set';

  @ApiProperty({
    description: 'Metadata key (1–128 chars; letters, digits, and `-` `_` `:` separators).',
    example: 'crm:ticketId',
  })
  @Validate(IsValidMetadataSignalKey)
  key: string;

  @ApiProperty({
    description: 'JSON-serializable value to store.',
    example: 'TCK-1001',
  })
  @IsDefined()
  value: unknown;
}

/** OpenAPI: delete a metadata key. */
export class MetadataDeleteSignalDto {
  @ApiProperty({ enum: ['metadata'] })
  @Equals('metadata')
  type: 'metadata';

  @ApiProperty({ enum: ['delete'] })
  @Equals('delete')
  action: 'delete';

  @ApiProperty({
    description: 'Metadata key to remove.',
    example: 'crm:ticketId',
  })
  @Validate(IsValidMetadataSignalKey)
  key: string;
}

/** OpenAPI: clear all conversation metadata. */
export class MetadataClearSignalDto {
  @ApiProperty({ enum: ['metadata'] })
  @Equals('metadata')
  type: 'metadata';

  @ApiProperty({ enum: ['clear'] })
  @Equals('clear')
  action: 'clear';
}

/** OpenAPI: trigger a Novu workflow from the agent turn. */
export class TriggerSignalDto {
  @ApiProperty({ enum: ['trigger'] })
  @Equals('trigger')
  type: 'trigger';

  @ApiProperty({
    description: 'Workflow identifier (same string used with `events.trigger`).',
    example: 'order-shipped',
  })
  @IsString()
  @IsNotEmpty()
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
  @IsOptional()
  @Validate(IsValidTriggerRecipient)
  to?: TriggerRecipientsPayload;

  @ApiPropertyOptional({
    description: 'Arbitrary payload forwarded to the workflow.',
    type: 'object',
    additionalProperties: true,
    example: { orderId: 'ORD-42' },
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

/** OpenAPI: create a human interaction in the current conversation thread. */
export class HumanSignalDto {
  @ApiProperty({ enum: ['human'] })
  @Equals('human')
  type: 'human';

  @ApiProperty({
    enum: HUMAN_SIGNAL_KINDS,
    description: 'Interaction verb queued by `ctx.ask` / `ctx.approve` / `ctx.choose` / `ctx.tell`.',
    example: 'approve',
  })
  @IsIn(HUMAN_SIGNAL_KINDS)
  kind: (typeof HUMAN_SIGNAL_KINDS)[number];

  @ApiProperty({
    description: 'Question, action description, or one-way message shown to the human.',
    example: 'Deploy v2.4.1 to production?',
  })
  @IsString()
  @Matches(/\S/)
  prompt: string;

  @ApiProperty({
    description: 'Client-minted id returned by the framework helper; echoed on `ctx.humanResponse.requestId`.',
    example: 'hr_7c2e1a3b-4d5f-6789-abcd-ef0123456789',
  })
  @IsString()
  @Matches(/\S/)
  requestId: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Choice labels — required for `choose`, ignored otherwise.',
    example: ['us-east', 'eu-west'],
  })
  @ValidateIf((signal: HumanSignalDto) => signal.kind === 'choose')
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Matches(/\S/, { each: true })
  options?: string[];

  @ApiPropertyOptional({
    description: 'Attribution label rendered in the card.',
    example: 'deploy-bot',
  })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({
    description: `Seconds until the interaction expires. Default 86400 (24h), max ${HUMAN_INTERACTION_MAX_TTL_SECONDS}.`,
    example: 3600,
  })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(HUMAN_INTERACTION_MAX_TTL_SECONDS)
  ttlSeconds?: number;

  @ApiPropertyOptional({
    description: `Novu subscriberId(s) allowed to settle this interaction (max ${HUMAN_INTERACTION_MAX_RECIPIENTS}). First valid answer wins. When omitted, the conversation subscriber is used. Subscriber ids only — not workflow topic recipients.`,
    oneOf: [
      { type: 'string', example: 'alice' },
      { type: 'array', items: { type: 'string' }, example: ['alice', 'bob'] },
    ],
  })
  @IsOptional()
  @Validate(IsValidHumanTo)
  to?: string | string[];
}

export type AgentSignalDto =
  | MetadataSetSignalDto
  | MetadataDeleteSignalDto
  | MetadataClearSignalDto
  | TriggerSignalDto
  | HumanSignalDto;

class UnrecognizedAgentSignalDto {
  @IsIn(SIGNAL_TYPES, { message: 'signals must be of type metadata, trigger, or human' })
  type: string;
}

class InvalidAgentSignalDto {
  @Equals('object', { message: 'each signal must be an object of type metadata, trigger, or human' })
  type: 'object';
}

function isAgentSignalType(value: unknown): value is (typeof SIGNAL_TYPES)[number] {
  return typeof value === 'string' && (SIGNAL_TYPES as readonly string[]).includes(value);
}

function resolveAgentSignalDto(plain: object): ClassConstructor<object> {
  const signal = plain as { type?: unknown; action?: unknown };
  if (!isAgentSignalType(signal.type)) {
    return UnrecognizedAgentSignalDto;
  }

  switch (signal.type) {
    case 'human':
      return HumanSignalDto;
    case 'trigger':
      return TriggerSignalDto;
    case 'metadata':
      if (signal.action === 'delete') {
        return MetadataDeleteSignalDto;
      }
      if (signal.action === 'clear') {
        return MetadataClearSignalDto;
      }

      return MetadataSetSignalDto;
    default: {
      const exhaustive: never = signal.type;
      void exhaustive;

      return UnrecognizedAgentSignalDto;
    }
  }
}

export function toAgentSignalDtos(value: unknown): unknown {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return plainToInstance(InvalidAgentSignalDto, { type: 'invalid' });
    }

    return plainToInstance(resolveAgentSignalDto(item), item);
  });
}
