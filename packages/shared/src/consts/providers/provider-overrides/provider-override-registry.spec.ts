import { describe, expect, it } from 'vitest';
import { ChatProviderIdEnum, PushProviderIdEnum, ToolProviderIdEnum } from '../../../types';
import { FCM_ROUTING_KEYS } from './fcm/keys';
import {
  CHAT_CONTENT_OVERRIDE_PROVIDER_IDS,
  CONTENT_OVERRIDE_PROVIDER_IDS,
  expoOverrideJsonSchema,
  getProviderOverrideConfig,
  getProviderOverrideKeys,
  getProviderOverrideKeysOnlySchema,
  getProviderOverrideSchema,
  getProviderPrimaryContentKey,
  getToolProviderOverrideKeys,
  getToolProviderOverrideKeysOnlySchema,
  getToolProviderOverrideSchema,
  getToolProviderPrimaryContentKey,
  grafanaOverrideJsonSchema,
  mergeProviderPreview,
  mergeToolProviderPreview,
  opsgenieOverrideJsonSchema,
  PROVIDER_OVERRIDE_KEYS,
  PROVIDER_OVERRIDE_SCHEMAS,
  PROVIDER_PRIMARY_CONTENT_KEY,
  PUSH_CONTENT_OVERRIDE_PROVIDER_IDS,
  pagerdutyOverrideJsonSchema,
  supportsContentProviderOverrides,
  TOOL_CONTENT_OVERRIDE_PROVIDER_IDS,
  TOOL_PROVIDER_OVERRIDE_KEYS,
  TOOL_PROVIDER_OVERRIDE_SCHEMAS,
  TOOL_PROVIDER_PRIMARY_CONTENT_KEY,
  toLiquidTolerantSchema,
} from './index';

describe('provider override registry', () => {
  it('registers every chat provider so a new one cannot ship unconfigured', () => {
    expect([...CHAT_CONTENT_OVERRIDE_PROVIDER_IDS].sort()).toEqual(Object.values(ChatProviderIdEnum).sort());
  });

  it('registers Expo as a schema-backed push provider with body as the primary content key', () => {
    const config = getProviderOverrideConfig(PushProviderIdEnum.EXPO);
    const keys = getProviderOverrideKeys(PushProviderIdEnum.EXPO) ?? [];

    expect(config?.schema).toBeDefined();
    expect(config?.primaryContentKey).toBe('body');
    expect(keys).toEqual(expect.arrayContaining(['body', 'channelId', 'interruptionLevel', 'tag']));
    expect(keys).not.toContain('to');
  });

  it('keeps schema-less push providers as escape hatches with no primary content key', () => {
    expect([...PUSH_CONTENT_OVERRIDE_PROVIDER_IDS].sort()).toEqual(Object.values(PushProviderIdEnum).sort());

    for (const providerId of PUSH_CONTENT_OVERRIDE_PROVIDER_IDS) {
      const config = getProviderOverrideConfig(providerId);
      const isSchemaBacked = Boolean(config?.schema || config?.schemaSubpath);

      if (isSchemaBacked) {
        continue;
      }

      expect(config?.schema).toBeUndefined();
      expect(config?.schemaSubpath).toBeUndefined();
      expect(config?.keys).toBeUndefined();
      expect(config?.primaryContentKey).toBeNull();
    }

    expect(supportsContentProviderOverrides('push')).toBe(true);
  });

  it('exposes every tool provider, including the schema-less webhook', () => {
    expect(TOOL_CONTENT_OVERRIDE_PROVIDER_IDS).toEqual([
      ToolProviderIdEnum.PagerDuty,
      ToolProviderIdEnum.Opsgenie,
      ToolProviderIdEnum.Grafana,
      ToolProviderIdEnum.Webhook,
    ]);
  });

  it('keeps each config in step with the key inventory published alongside it', () => {
    for (const providerId of CONTENT_OVERRIDE_PROVIDER_IDS) {
      expect(getProviderOverrideConfig(providerId)?.keys).toEqual(getProviderOverrideKeys(providerId));
    }
  });

  it('maps each eager schema to a strict object schema', () => {
    expect(PROVIDER_OVERRIDE_SCHEMAS[ToolProviderIdEnum.PagerDuty]).toBe(pagerdutyOverrideJsonSchema);
    expect(PROVIDER_OVERRIDE_SCHEMAS[ToolProviderIdEnum.Opsgenie]).toBe(opsgenieOverrideJsonSchema);
    expect(PROVIDER_OVERRIDE_SCHEMAS[ToolProviderIdEnum.Grafana]).toBe(grafanaOverrideJsonSchema);
    expect(PROVIDER_OVERRIDE_SCHEMAS[PushProviderIdEnum.EXPO]).toBe(expoOverrideJsonSchema);

    for (const schema of Object.values(PROVIDER_OVERRIDE_SCHEMAS)) {
      expect(schema.additionalProperties).toBe(false);
    }
  });

  it('keeps documented free-form maps permissive', () => {
    expect(pagerdutyOverrideJsonSchema.properties.custom_details.additionalProperties).toBe(true);
    expect(opsgenieOverrideJsonSchema.properties.details.additionalProperties).toBe(true);
    expect(expoOverrideJsonSchema.properties.data.additionalProperties).toBe(true);
  });

  it('documents the primary content fields for each tool provider', () => {
    expect(pagerdutyOverrideJsonSchema.properties?.summary).toBeDefined();
    expect(pagerdutyOverrideJsonSchema.properties?.severity).toBeDefined();
    expect(opsgenieOverrideJsonSchema.properties?.message).toBeDefined();
    expect(opsgenieOverrideJsonSchema.properties?.priority).toBeDefined();
    expect(grafanaOverrideJsonSchema.properties?.title).toBeDefined();
    expect(grafanaOverrideJsonSchema.properties?.message).toBeDefined();
  });

  it('exposes a key inventory that matches each eager schema property set', () => {
    for (const [providerId, schema] of Object.entries(PROVIDER_OVERRIDE_SCHEMAS)) {
      expect(PROVIDER_OVERRIDE_KEYS[providerId as keyof typeof PROVIDER_OVERRIDE_KEYS]).toEqual(
        Object.keys(schema.properties ?? {})
      );
      expect(getProviderOverrideKeys(providerId)).toEqual(
        PROVIDER_OVERRIDE_KEYS[providerId as keyof typeof PROVIDER_OVERRIDE_KEYS]
      );
    }
  });

  it('derives keys-only schemas that are strict on names and permissive on values', () => {
    const keysOnlySchema = getProviderOverrideKeysOnlySchema(ToolProviderIdEnum.Opsgenie);

    expect(keysOnlySchema?.additionalProperties).toBe(false);
    expect(Object.keys(keysOnlySchema?.properties ?? {})).toEqual(Object.keys(opsgenieOverrideJsonSchema.properties));
    expect(keysOnlySchema?.properties?.priority).toBe(true);
  });

  it('returns no static metadata for the tool webhook escape hatch', () => {
    expect(getProviderOverrideSchema(ToolProviderIdEnum.Webhook)).toBeUndefined();
    expect(getProviderOverrideKeys(ToolProviderIdEnum.Webhook)).toBeUndefined();
    expect(getProviderOverrideKeysOnlySchema(ToolProviderIdEnum.Webhook)).toBeUndefined();
    expect(getProviderPrimaryContentKey(ToolProviderIdEnum.Webhook)).toBeNull();
  });

  it('returns undefined for unregistered provider ids', () => {
    expect(getProviderOverrideSchema('unknown')).toBeUndefined();
    expect(getProviderOverrideKeys('unknown')).toBeUndefined();
    expect(getProviderOverrideKeysOnlySchema('unknown')).toBeUndefined();
  });

  it('ignores Object.prototype property names as provider ids', () => {
    expect(getProviderOverrideSchema('toString')).toBeUndefined();
    expect(getProviderOverrideKeys('constructor')).toBeUndefined();
    expect(getProviderOverrideKeysOnlySchema('valueOf')).toBeUndefined();
  });

  it('points each chat provider at the payload key its step body falls back into', () => {
    expect(getProviderPrimaryContentKey(ChatProviderIdEnum.Slack)).toBe('text');
    expect(getProviderPrimaryContentKey(ChatProviderIdEnum.Discord)).toBe('content');
    expect(getProviderPrimaryContentKey(ChatProviderIdEnum.GrafanaOnCall)).toBe('message');
    expect(getProviderPrimaryContentKey(ToolProviderIdEnum.PagerDuty)).toBe('summary');
    expect(getProviderPrimaryContentKey(ToolProviderIdEnum.Opsgenie)).toBe('message');
    expect(getProviderPrimaryContentKey(ToolProviderIdEnum.Grafana)).toBe('title');
  });

  it('uses dotted paths for providers that nest their content under a stable object key', () => {
    expect(getProviderPrimaryContentKey(ChatProviderIdEnum.WhatsAppBusiness)).toBe('text.body');
    expect(getProviderPrimaryContentKey(ChatProviderIdEnum.RocketChat)).toBe('message.msg');
  });

  it('reports no scalar fallback key for LINE and seeds messages when absent', () => {
    expect(getProviderPrimaryContentKey(ChatProviderIdEnum.Line)).toBeNull();

    const seed = getProviderOverrideConfig(ChatProviderIdEnum.Line)?.seedWhenAbsent;
    expect(seed?.key).toBe('messages');
    expect(seed?.defaultContentKey).toBe('messages.0.text');
    expect(seed?.buildDefault('Hello')).toEqual([{ type: 'text', text: 'Hello' }]);
  });

  it('reports no fallback key for an unregistered provider', () => {
    expect(getProviderPrimaryContentKey('unknown')).toBeUndefined();
  });

  it('leaves schema-less chat providers as free-form escape hatches', () => {
    expect(getProviderOverrideSchema(ChatProviderIdEnum.Discord)).toBeUndefined();
    expect(getProviderOverrideKeys(ChatProviderIdEnum.Discord)).toBeUndefined();
    expect(getProviderOverrideKeysOnlySchema(ChatProviderIdEnum.Discord)).toBeUndefined();
    expect(getProviderOverrideConfig(ChatProviderIdEnum.Discord)?.schemaSubpath).toBeUndefined();
  });

  it('exposes Slack keys eagerly while its schema stays behind a package subpath', () => {
    const config = getProviderOverrideConfig(ChatProviderIdEnum.Slack);

    expect(config?.schema).toBeUndefined();
    expect(config?.schemaSubpath).toBe('@novu/shared/provider-overrides/slack');
    expect(getProviderOverrideKeys(ChatProviderIdEnum.Slack)).toContain('blocks');
    expect(getProviderOverrideKeysOnlySchema(ChatProviderIdEnum.Slack)?.properties?.blocks).toBe(true);
  });

  it('exposes Telegram keys eagerly while its schema stays behind a package subpath', () => {
    const config = getProviderOverrideConfig(ChatProviderIdEnum.Telegram);

    expect(config?.schema).toBeUndefined();
    expect(config?.schemaSubpath).toBe('@novu/shared/provider-overrides/telegram');
    expect(config?.primaryContentKey).toBe('text');
    expect(getProviderOverrideKeys(ChatProviderIdEnum.Telegram)).toContain('parse_mode');
    expect(getProviderOverrideKeys(ChatProviderIdEnum.Telegram)).toContain('reply_markup');
    expect(getProviderOverrideKeysOnlySchema(ChatProviderIdEnum.Telegram)?.properties?.parse_mode).toBe(true);
  });

  it('exposes WhatsApp keys eagerly while its schema stays behind a package subpath', () => {
    const config = getProviderOverrideConfig(ChatProviderIdEnum.WhatsAppBusiness);

    expect(config?.schema).toBeUndefined();
    expect(config?.schemaSubpath).toBe('@novu/shared/provider-overrides/whatsapp');
    expect(config?.primaryContentKey).toBe('text.body');
    expect(getProviderOverrideKeys(ChatProviderIdEnum.WhatsAppBusiness)).toContain('type');
    expect(getProviderOverrideKeys(ChatProviderIdEnum.WhatsAppBusiness)).toContain('text');
    expect(getProviderOverrideKeys(ChatProviderIdEnum.WhatsAppBusiness)).toContain('template');
    expect(getProviderOverrideKeysOnlySchema(ChatProviderIdEnum.WhatsAppBusiness)?.properties?.template).toBe(true);
  });

  it('exposes FCM keys eagerly while its schema stays behind a package subpath', () => {
    const config = getProviderOverrideConfig(PushProviderIdEnum.FCM);
    const keys = getProviderOverrideKeys(PushProviderIdEnum.FCM) ?? [];

    expect(config?.schema).toBeUndefined();
    expect(config?.schemaSubpath).toBe('@novu/shared/provider-overrides/fcm');
    expect(config?.primaryContentKey).toBe('notification.body');
    expect(keys).toEqual(
      expect.arrayContaining([
        'notification',
        'data',
        'android',
        'apns',
        'webpush',
        'fcmOptions',
        'token',
        'tokens',
        'topic',
        'condition',
      ])
    );
    expect(config?.exclusiveKeyGroups).toEqual([FCM_ROUTING_KEYS]);
    expect(getProviderOverrideKeysOnlySchema(PushProviderIdEnum.FCM)?.properties?.notification).toBe(true);
    expect(getProviderOverrideKeysOnlySchema(PushProviderIdEnum.FCM)?.properties?.topic).toBe(true);
  });

  it('pairs every eager schema with a liquid-tolerant twin', () => {
    for (const [providerId, schema] of Object.entries(PROVIDER_OVERRIDE_SCHEMAS)) {
      const config = getProviderOverrideConfig(providerId);

      expect(config?.schema).toBe(schema);
      expect(config?.liquidTolerantSchema).toEqual(toLiquidTolerantSchema(schema));
    }
  });

  it('keeps the deprecated tool-scoped names pointing at the same registry', () => {
    expect(TOOL_PROVIDER_OVERRIDE_SCHEMAS).toBe(PROVIDER_OVERRIDE_SCHEMAS);
    expect(TOOL_PROVIDER_OVERRIDE_KEYS).toBe(PROVIDER_OVERRIDE_KEYS);
    expect(getToolProviderOverrideSchema).toBe(getProviderOverrideSchema);
    expect(getToolProviderOverrideKeys).toBe(getProviderOverrideKeys);
    expect(getToolProviderOverrideKeysOnlySchema).toBe(getProviderOverrideKeysOnlySchema);
    expect(mergeToolProviderPreview).toBe(mergeProviderPreview);
  });

  it('keeps the deprecated primary content map on its original string-or-absent shape', () => {
    expect(Object.keys(TOOL_PROVIDER_PRIMARY_CONTENT_KEY)).toEqual([
      ToolProviderIdEnum.PagerDuty,
      ToolProviderIdEnum.Opsgenie,
      ToolProviderIdEnum.Grafana,
    ]);
    expect(TOOL_PROVIDER_PRIMARY_CONTENT_KEY[ToolProviderIdEnum.PagerDuty]).toBe('summary');
    expect(TOOL_PROVIDER_PRIMARY_CONTENT_KEY[ToolProviderIdEnum.Opsgenie]).toBe('message');
    expect(TOOL_PROVIDER_PRIMARY_CONTENT_KEY[ToolProviderIdEnum.Grafana]).toBe('title');
    expect(TOOL_PROVIDER_PRIMARY_CONTENT_KEY[ToolProviderIdEnum.Webhook]).toBeUndefined();
    expect(getToolProviderPrimaryContentKey(ChatProviderIdEnum.Line)).toBeUndefined();
    expect(PROVIDER_PRIMARY_CONTENT_KEY[ChatProviderIdEnum.Line]).toBeNull();
  });
});
