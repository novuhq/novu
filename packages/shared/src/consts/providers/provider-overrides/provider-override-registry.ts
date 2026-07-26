import type { JSONSchemaDto } from '../../../dto/workflows/json-schema-dto';
import { ChannelTypeEnum, ChatProviderIdEnum, StepTypeEnum, ToolProviderIdEnum } from '../../../types';
import { toLiquidTolerantSchema } from './liquid-tolerant';
import { opsgenieOverrideJsonSchema } from './opsgenie-override.schema';
import { pagerdutyOverrideJsonSchema } from './pagerduty-override.schema';
import {
  NON_OVERRIDABLE_SLACK_KEYS,
  SLACK_OVERRIDE_KEYS,
  SLACK_OVERRIDE_SCHEMA_SUBPATH,
  SLACK_PRIMARY_CONTENT_KEY,
} from './slack/keys';

export type ProviderOverrideConfig = {
  /** Absent => escape hatch: free-form JSON, no validation beyond well-formedness. */
  schema?: JSONSchemaDto;
  /** Derived from `schema` by the liquid-tolerant transform. */
  liquidTolerantSchema?: JSONSchemaDto;
  /**
   * Set instead of `schema` when the schema is too large to sit in the eagerly loaded barrel and
   * ships behind a package subpath. `keys` still resolves eagerly, so key-level validation and the
   * dashboard's provider list never pay for it.
   */
  schemaSubpath?: string;
  /** Top-level override keys. Present for every provider that has a schema, lazy or not. */
  keys?: readonly string[];
  /**
   * Keys the send path strips from a merged override before handing it to the provider, because
   * Novu owns them (routing, credentials). Leaving them out of `schema` only produces an advisory
   * step issue, so enforcement has to happen at send. A dot in a key makes it a nested path
   * (Rocket.Chat routes via `message.rid` while its content lives beside it in `message.msg`).
   */
  reservedKeys?: readonly string[];
  /** Top-level payload key the step body falls back into. null when the provider nests its content. */
  primaryContentKey: string | null;
};

/**
 * Eagerly available schemas only — Slack's is large enough to warrant its own package subpath.
 *
 * This and `PROVIDER_OVERRIDE_KEYS` stay object literals rather than being derived from
 * `PROVIDER_OVERRIDE_CONFIGS`: published consumers index them by a literal provider id and rely
 * on the resulting non-optional type, which a derived `Partial<Record<...>>` would lose. The
 * configs read their `keys` back out of the map below, and a spec asserts the two agree.
 */
export const PROVIDER_OVERRIDE_SCHEMAS = {
  [ToolProviderIdEnum.PagerDuty]: pagerdutyOverrideJsonSchema,
  [ToolProviderIdEnum.Opsgenie]: opsgenieOverrideJsonSchema,
} as const satisfies Partial<Record<ToolProviderIdEnum | ChatProviderIdEnum, JSONSchemaDto>>;

/** Top-level override keys for each provider — shared by validation, UI, and send-path reservation. */
export const PROVIDER_OVERRIDE_KEYS = {
  [ToolProviderIdEnum.PagerDuty]: Object.keys(pagerdutyOverrideJsonSchema.properties),
  [ToolProviderIdEnum.Opsgenie]: Object.keys(opsgenieOverrideJsonSchema.properties),
  [ChatProviderIdEnum.Slack]: SLACK_OVERRIDE_KEYS,
} as const satisfies Partial<Record<ToolProviderIdEnum | ChatProviderIdEnum, readonly string[]>>;

function schemaBacked(schema: JSONSchemaDto, keys: readonly string[], primaryContentKey: string) {
  return {
    schema,
    liquidTolerantSchema: toLiquidTolerantSchema(schema),
    keys,
    primaryContentKey,
  } satisfies ProviderOverrideConfig;
}

/** Free-form JSON passthrough: the provider accepts keys we cannot describe up front. */
function escapeHatch(primaryContentKey: string | null, reservedKeys?: readonly string[]) {
  return { primaryContentKey, ...(reservedKeys ? { reservedKeys } : {}) } satisfies ProviderOverrideConfig;
}

const TOOL_PROVIDER_OVERRIDE_CONFIGS = {
  [ToolProviderIdEnum.PagerDuty]: schemaBacked(
    pagerdutyOverrideJsonSchema,
    PROVIDER_OVERRIDE_KEYS[ToolProviderIdEnum.PagerDuty],
    'summary'
  ),
  [ToolProviderIdEnum.Opsgenie]: schemaBacked(
    opsgenieOverrideJsonSchema,
    PROVIDER_OVERRIDE_KEYS[ToolProviderIdEnum.Opsgenie],
    'message'
  ),
  [ToolProviderIdEnum.Webhook]: escapeHatch(null),
} satisfies Record<ToolProviderIdEnum, ProviderOverrideConfig>;

/**
 * Every chat provider is registered, even the schema-less ones, so `satisfies Record<...>` fails
 * the build when a provider joins the enum without a decision about how its overrides behave.
 * Primary content keys mirror the field each provider drops the compiled body into; `null` means
 * the body is nested (Line `messages[].text`, WhatsApp `text.body`, Rocket.Chat `message.msg`)
 * and there is no flat top-level equivalent to fall back into.
 *
 * Reserved keys cover the providers whose request *body* carries the destination, so a persisted
 * override cannot re-route a subscriber's message (Slack `channel`, Telegram `chat_id`, LINE and
 * WhatsApp `to`, Sendblue `number`, Mattermost `channel`, Rocket.Chat `message.rid`, Webex
 * `roomId`/`toPersonId`/`toPersonEmail`). Webhook-URL providers (Discord, MS Teams, Zulip,
 * Grafana OnCall, Ryver, GetStream, generic webhook) reserve nothing: their destination is the
 * stored channel endpoint, and `webhookUrl`/`endpoint` overrides are stripped generically by the
 * send path before this per-provider strip runs.
 */
const CHAT_PROVIDER_OVERRIDE_CONFIGS = {
  [ChatProviderIdEnum.Slack]: {
    schemaSubpath: SLACK_OVERRIDE_SCHEMA_SUBPATH,
    keys: PROVIDER_OVERRIDE_KEYS[ChatProviderIdEnum.Slack],
    reservedKeys: NON_OVERRIDABLE_SLACK_KEYS,
    primaryContentKey: SLACK_PRIMARY_CONTENT_KEY,
  },
  // `novu-slack` is Slack posted through Novu-managed credentials, but it is not given Slack's
  // schema: the demo integration is not the place to surface Block Kit validation.
  [ChatProviderIdEnum.Novu]: escapeHatch('text'),
  [ChatProviderIdEnum.Discord]: escapeHatch('content'),
  [ChatProviderIdEnum.MsTeams]: escapeHatch('text'),
  [ChatProviderIdEnum.WebexMessaging]: escapeHatch('text', ['roomId', 'parentId', 'toPersonId', 'toPersonEmail']),
  [ChatProviderIdEnum.Mattermost]: escapeHatch('text', ['channel']),
  [ChatProviderIdEnum.Ryver]: escapeHatch('content'),
  [ChatProviderIdEnum.Zulip]: escapeHatch('text'),
  [ChatProviderIdEnum.GrafanaOnCall]: escapeHatch('message'),
  [ChatProviderIdEnum.GetStream]: escapeHatch('text'),
  [ChatProviderIdEnum.RocketChat]: escapeHatch(null, ['message.rid']),
  [ChatProviderIdEnum.WhatsAppBusiness]: escapeHatch(null, ['to']),
  [ChatProviderIdEnum.Line]: escapeHatch(null, ['to']),
  [ChatProviderIdEnum.ChatWebhook]: escapeHatch('content'),
  [ChatProviderIdEnum.Telegram]: escapeHatch('text', ['chat_id']),
  [ChatProviderIdEnum.Sendblue]: escapeHatch('content', ['number', 'from_number']),
} satisfies Record<ChatProviderIdEnum, ProviderOverrideConfig>;

export const PROVIDER_OVERRIDE_CONFIGS = {
  ...TOOL_PROVIDER_OVERRIDE_CONFIGS,
  ...CHAT_PROVIDER_OVERRIDE_CONFIGS,
};

export type ToolContentOverrideProviderId = keyof typeof TOOL_PROVIDER_OVERRIDE_CONFIGS;
export type ChatContentOverrideProviderId = keyof typeof CHAT_PROVIDER_OVERRIDE_CONFIGS;
export type ContentOverrideProviderId = ToolContentOverrideProviderId | ChatContentOverrideProviderId;

export const TOOL_CONTENT_OVERRIDE_PROVIDER_IDS = Object.keys(
  TOOL_PROVIDER_OVERRIDE_CONFIGS
) as ToolContentOverrideProviderId[];

export const CHAT_CONTENT_OVERRIDE_PROVIDER_IDS = Object.keys(
  CHAT_PROVIDER_OVERRIDE_CONFIGS
) as ChatContentOverrideProviderId[];

export const CONTENT_OVERRIDE_PROVIDER_IDS: ContentOverrideProviderId[] = [
  ...TOOL_CONTENT_OVERRIDE_PROVIDER_IDS,
  ...CHAT_CONTENT_OVERRIDE_PROVIDER_IDS,
];

/**
 * The channels whose steps can carry per-provider content overrides. Both enums are accepted
 * because their members share string values and each layer keys by whichever one it speaks:
 * the dashboard by `ChannelTypeEnum`, step construction by `StepTypeEnum`.
 */
export type OverrideChannelType = ChannelTypeEnum.CHAT | ChannelTypeEnum.TOOL | StepTypeEnum.CHAT | StepTypeEnum.TOOL;

const CONTENT_OVERRIDE_PROVIDER_IDS_BY_CHANNEL = {
  [ChannelTypeEnum.CHAT]: CHAT_CONTENT_OVERRIDE_PROVIDER_IDS,
  [ChannelTypeEnum.TOOL]: TOOL_CONTENT_OVERRIDE_PROVIDER_IDS,
} as const satisfies Record<OverrideChannelType, readonly ContentOverrideProviderId[]>;

export function getContentOverrideProviderIds(channel: OverrideChannelType): readonly ContentOverrideProviderId[] {
  return CONTENT_OVERRIDE_PROVIDER_IDS_BY_CHANNEL[channel];
}

/** Primary content field that falls back to the step's default `body`. */
export const PROVIDER_PRIMARY_CONTENT_KEY = Object.fromEntries(
  Object.entries(PROVIDER_OVERRIDE_CONFIGS).map(([providerId, config]) => [providerId, config.primaryContentKey])
) as Record<ContentOverrideProviderId, string | null>;

export function getProviderOverrideConfig(providerId: string): ProviderOverrideConfig | undefined {
  if (Object.prototype.hasOwnProperty.call(PROVIDER_OVERRIDE_CONFIGS, providerId)) {
    return PROVIDER_OVERRIDE_CONFIGS[providerId as ContentOverrideProviderId];
  }

  return undefined;
}

export function getProviderOverrideSchema(providerId: string) {
  if (Object.prototype.hasOwnProperty.call(PROVIDER_OVERRIDE_SCHEMAS, providerId)) {
    return PROVIDER_OVERRIDE_SCHEMAS[providerId as keyof typeof PROVIDER_OVERRIDE_SCHEMAS];
  }

  return undefined;
}

export function getProviderOverrideKeys(providerId: string): readonly string[] | undefined {
  if (Object.prototype.hasOwnProperty.call(PROVIDER_OVERRIDE_KEYS, providerId)) {
    return PROVIDER_OVERRIDE_KEYS[providerId as keyof typeof PROVIDER_OVERRIDE_KEYS];
  }

  return undefined;
}

export function getProviderPrimaryContentKey(providerId: string): string | null | undefined {
  return getProviderOverrideConfig(providerId)?.primaryContentKey;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Removes one reserved key (given as a path of segments) from `target`, cloning only the objects
 * along the path. Returns `target` itself when the path is absent, so callers can detect no-ops
 * by identity.
 */
function stripPath(target: Record<string, unknown>, path: readonly string[]): Record<string, unknown> {
  const [head, ...rest] = path;
  if (head === undefined || !(head in target)) {
    return target;
  }

  if (rest.length === 0) {
    const { [head]: _removed, ...remaining } = target;

    return remaining;
  }

  const child = target[head];
  if (!isRecord(child)) {
    return target;
  }

  const strippedChild = stripPath(child, rest);
  if (strippedChild === child) {
    return target;
  }

  return { ...target, [head]: strippedChild };
}

function stripReservedFrom(target: Record<string, unknown>, reservedKeys: readonly string[]): Record<string, unknown> {
  let result = target;
  for (const key of reservedKeys) {
    result = stripPath(result, key.split('.'));
  }

  return result;
}

/**
 * Strips the keys Novu owns (routing, credentials) from a merged override payload. A dot in a
 * reserved key addresses a nested field, leaving its siblings intact (Rocket.Chat's `message.rid`
 * is stripped while `message.msg` — the content — survives).
 *
 * Reserved keys are removed from `_passthrough.body` as well: the provider send path merges
 * `_passthrough.body` with the highest precedence, so leaving it untouched would let an override
 * smuggle `channel`/`token` past the top-level strip and redirect a subscriber's message. The rest
 * of `_passthrough` stays intact — it remains the documented door for raw provider API fields
 * Novu does not own.
 */
export function stripReservedOverrideKeys<T extends Record<string, unknown>>(providerId: string, override: T): T {
  const reservedKeys = getProviderOverrideConfig(providerId)?.reservedKeys;
  if (!reservedKeys?.length) {
    return override;
  }

  let stripped: Record<string, unknown> = stripReservedFrom(override, reservedKeys);

  const passthrough = isRecord(stripped._passthrough) ? stripped._passthrough : undefined;
  const passthroughBody = passthrough && isRecord(passthrough.body) ? passthrough.body : undefined;
  if (passthrough && passthroughBody) {
    const strippedBody = stripReservedFrom(passthroughBody, reservedKeys);
    if (strippedBody !== passthroughBody) {
      stripped = stripped === override ? { ...override } : stripped;
      stripped._passthrough = { ...passthrough, body: strippedBody };
    }
  }

  return stripped as T;
}

/**
 * Step-issues contract for providerOverrides where only key names can be checked: top-level keys
 * only, values unchecked. Distinct from the full override schemas, which also set nested
 * `additionalProperties: false`.
 *
 * Property schemas use boolean `true` (always-valid) rather than `{}` so Mongoose minimize cannot
 * strip them when controls.schema is persisted as Mixed.
 */
export function getProviderOverrideKeysOnlySchema(providerId: string): JSONSchemaDto | undefined {
  const keys = getProviderOverrideKeys(providerId);
  if (!keys) {
    return undefined;
  }

  return {
    type: 'object',
    properties: Object.fromEntries(keys.map((key) => [key, true as const])),
    additionalProperties: false,
  };
}
