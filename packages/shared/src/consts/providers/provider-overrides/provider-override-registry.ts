import type { JSONSchemaDto } from '../../../dto/workflows/json-schema-dto';
import { ChannelTypeEnum, ChatProviderIdEnum, StepTypeEnum, ToolProviderIdEnum } from '../../../types';
import { grafanaOverrideJsonSchema } from './grafana-override.schema';
import { toLiquidTolerantSchema } from './liquid-tolerant';
import { opsgenieOverrideJsonSchema } from './opsgenie-override.schema';
import { pagerdutyOverrideJsonSchema } from './pagerduty-override.schema';
import { SLACK_OVERRIDE_KEYS, SLACK_OVERRIDE_SCHEMA_SUBPATH, SLACK_PRIMARY_CONTENT_KEY } from './slack/keys';
import {
  TELEGRAM_OVERRIDE_KEYS,
  TELEGRAM_OVERRIDE_SCHEMA_SUBPATH,
  TELEGRAM_PRIMARY_CONTENT_KEY,
} from './telegram/keys';
import {
  WHATSAPP_OVERRIDE_KEYS,
  WHATSAPP_OVERRIDE_SCHEMA_SUBPATH,
  WHATSAPP_PRIMARY_CONTENT_KEY,
} from './whatsapp/keys';

/**
 * When `primaryContentKey` is null but the step body still seeds a top-level override field
 * (e.g. LINE `messages`), describe how preview fills that field when the override omits it.
 */
export type ProviderOverrideSeedWhenAbsent = {
  /** Top-level override key that holds the seeded value (must be absent or non-array to seed). */
  key: string;
  /** Builds the seeded value from the compiled step body. */
  buildDefault: (body: string) => unknown;
  /** Dotted path used to annotate the seeded value in the override preview. */
  defaultContentKey: string;
  /** Escape-hatch callout sentence explaining the seed/replace policy. */
  escapeHatchHint: string;
};

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
   * Payload key the step body falls back into. May be a dotted path for nested content
   * (WhatsApp `text.body`, Rocket.Chat `message.msg`). `null` when there is no stable
   * object-path equivalent — use `seedWhenAbsent` when the body still seeds an array-shaped field.
   */
  primaryContentKey: string | null;
  /**
   * Seeds a top-level field from the step body when the override omits that field as an array.
   * Used when content lives in an array element (LINE `messages[].text`) rather than a scalar path.
   */
  seedWhenAbsent?: ProviderOverrideSeedWhenAbsent;
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
  [ToolProviderIdEnum.Grafana]: grafanaOverrideJsonSchema,
} as const satisfies Partial<Record<ToolProviderIdEnum | ChatProviderIdEnum, JSONSchemaDto>>;

/** Top-level override keys for each provider — shared by validation and UI. */
export const PROVIDER_OVERRIDE_KEYS = {
  [ToolProviderIdEnum.PagerDuty]: Object.keys(pagerdutyOverrideJsonSchema.properties),
  [ToolProviderIdEnum.Opsgenie]: Object.keys(opsgenieOverrideJsonSchema.properties),
  [ToolProviderIdEnum.Grafana]: Object.keys(grafanaOverrideJsonSchema.properties),
  [ChatProviderIdEnum.Slack]: SLACK_OVERRIDE_KEYS,
  [ChatProviderIdEnum.Telegram]: TELEGRAM_OVERRIDE_KEYS,
  [ChatProviderIdEnum.WhatsAppBusiness]: WHATSAPP_OVERRIDE_KEYS,
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
function escapeHatch(primaryContentKey: string | null) {
  return { primaryContentKey } satisfies ProviderOverrideConfig;
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
  [ToolProviderIdEnum.Grafana]: schemaBacked(
    grafanaOverrideJsonSchema,
    PROVIDER_OVERRIDE_KEYS[ToolProviderIdEnum.Grafana],
    'title'
  ),
  [ToolProviderIdEnum.Webhook]: escapeHatch(null),
} satisfies Record<ToolProviderIdEnum, ProviderOverrideConfig>;

/**
 * Every chat provider is registered, even the schema-less ones, so `satisfies Record<...>` fails
 * the build when a provider joins the enum without a decision about how its overrides behave.
 * Primary content keys mirror the field each provider drops the compiled body into. Dotted paths
 * are used when the body lives under a nested object (WhatsApp `text.body`, Rocket.Chat
 * `message.msg`). `null` means there is no scalar/object path to fill — pair with
 * `seedWhenAbsent` when the body still seeds an array-shaped field (LINE `messages`).
 */
const CHAT_PROVIDER_OVERRIDE_CONFIGS = {
  [ChatProviderIdEnum.Slack]: {
    schemaSubpath: SLACK_OVERRIDE_SCHEMA_SUBPATH,
    keys: PROVIDER_OVERRIDE_KEYS[ChatProviderIdEnum.Slack],
    primaryContentKey: SLACK_PRIMARY_CONTENT_KEY,
  },
  // `novu-slack` is Slack posted through Novu-managed credentials, but it is not given Slack's
  // schema: the demo integration is not the place to surface Block Kit validation.
  [ChatProviderIdEnum.Novu]: escapeHatch('text'),
  [ChatProviderIdEnum.Discord]: escapeHatch('content'),
  [ChatProviderIdEnum.MsTeams]: escapeHatch('text'),
  [ChatProviderIdEnum.WebexMessaging]: escapeHatch('text'),
  [ChatProviderIdEnum.Mattermost]: escapeHatch('text'),
  [ChatProviderIdEnum.Ryver]: escapeHatch('content'),
  [ChatProviderIdEnum.Zulip]: escapeHatch('text'),
  [ChatProviderIdEnum.GrafanaOnCall]: escapeHatch('message'),
  [ChatProviderIdEnum.GetStream]: escapeHatch('text'),
  [ChatProviderIdEnum.RocketChat]: escapeHatch('message.msg'),
  [ChatProviderIdEnum.WhatsAppBusiness]: {
    schemaSubpath: WHATSAPP_OVERRIDE_SCHEMA_SUBPATH,
    keys: PROVIDER_OVERRIDE_KEYS[ChatProviderIdEnum.WhatsAppBusiness],
    primaryContentKey: WHATSAPP_PRIMARY_CONTENT_KEY,
  },
  [ChatProviderIdEnum.Line]: {
    primaryContentKey: null,
    seedWhenAbsent: {
      key: 'messages',
      buildDefault: (body) => [{ type: 'text', text: body }],
      defaultContentKey: 'messages.0.text',
      escapeHatchHint:
        'If this override sets messages, it replaces the default text message built from the step body. Omit messages to send the step body as a text message.',
    },
  },
  [ChatProviderIdEnum.ChatWebhook]: escapeHatch('content'),
  [ChatProviderIdEnum.Telegram]: {
    schemaSubpath: TELEGRAM_OVERRIDE_SCHEMA_SUBPATH,
    keys: PROVIDER_OVERRIDE_KEYS[ChatProviderIdEnum.Telegram],
    primaryContentKey: TELEGRAM_PRIMARY_CONTENT_KEY,
  },
  [ChatProviderIdEnum.Sendblue]: escapeHatch('content'),
  // Photon's provider reads `text` as its body override key (see photon-imessage.schema.ts).
  [ChatProviderIdEnum.PhotonImessage]: escapeHatch('text'),
  // Agent chat has no stable override schema yet — free-form passthrough keyed like Discord.
  [ChatProviderIdEnum.NovuAgentChat]: escapeHatch('content'),
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

export function supportsContentProviderOverrides(channel: string): channel is OverrideChannelType {
  return Object.prototype.hasOwnProperty.call(CONTENT_OVERRIDE_PROVIDER_IDS_BY_CHANNEL, channel);
}

/**
 * Runtime control-schema fragment that accepts stitched `providerOverrides`.
 * Persisted step schemas omit this field; bridge validation must still allow it.
 */
export const PROVIDER_OVERRIDES_RUNTIME_SCHEMA = {
  type: 'object',
  additionalProperties: {
    type: 'object',
    additionalProperties: true,
  },
} as const;

export function withProviderOverridesRuntimeSchema<T extends { properties?: Record<string, unknown> }>(
  controlSchema: T
): T & { properties: Record<string, unknown> } {
  return {
    ...controlSchema,
    properties: {
      ...(controlSchema.properties ?? {}),
      providerOverrides: PROVIDER_OVERRIDES_RUNTIME_SCHEMA,
    },
  };
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
