import { opsgenieOverrideJsonSchema, pagerdutyOverrideJsonSchema, ToolProviderIdEnum } from '@novu/shared';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';
import { toolControlSchema, toolControlZodSchema } from './tool-control.schema';

describe('toolControlZodSchema', () => {
  it('accepts default tool controls without provider overrides', () => {
    const result = toolControlZodSchema.safeParse({
      body: 'MemoryDB alert',
    });

    expect(result.success).toBe(true);
  });

  it('accepts optional providerOverrides keyed by providerId', () => {
    const result = toolControlZodSchema.safeParse({
      body: 'MemoryDB alert',
      providerOverrides: {
        [ToolProviderIdEnum.PagerDuty]: {
          severity: 'warning',
          summary: '{{payload.title}}',
        },
        [ToolProviderIdEnum.Opsgenie]: {
          priority: 'P2',
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it('accepts an empty override object (opt-in no-op)', () => {
    const result = toolControlZodSchema.safeParse({
      body: 'MemoryDB alert',
      providerOverrides: {
        [ToolProviderIdEnum.PagerDuty]: {},
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects unknown top-level control keys', () => {
    const result = toolControlZodSchema.safeParse({
      body: 'MemoryDB alert',
      unknownKey: true,
    });

    expect(result.success).toBe(false);
  });

  it('rejects unknown provider ids under providerOverrides', () => {
    const result = toolControlZodSchema.safeParse({
      body: 'MemoryDB alert',
      providerOverrides: {
        'tool-webhook': { foo: 'bar' },
      },
    });

    expect(result.success).toBe(false);
  });
});

describe('toolControlSchema (generated JSON schema)', () => {
  const getProviderSubschema = (providerId: ToolProviderIdEnum) => {
    const providerOverrides = toolControlSchema.properties?.providerOverrides as {
      properties?: Record<string, { properties?: Record<string, unknown>; additionalProperties?: boolean }>;
    };

    return providerOverrides.properties?.[providerId];
  };

  it('splices keys-only override subschemas per provider', () => {
    const pagerduty = getProviderSubschema(ToolProviderIdEnum.PagerDuty);
    const opsgenie = getProviderSubschema(ToolProviderIdEnum.Opsgenie);

    expect(pagerduty?.additionalProperties).toBe(false);
    expect(opsgenie?.additionalProperties).toBe(false);
    expect(Object.keys(pagerduty?.properties ?? {})).toEqual(Object.keys(pagerdutyOverrideJsonSchema.properties));
    expect(Object.keys(opsgenie?.properties ?? {})).toEqual(Object.keys(opsgenieOverrideJsonSchema.properties));
  });

  it('keeps override values permissive so Liquid templates pass', () => {
    const opsgenie = getProviderSubschema(ToolProviderIdEnum.Opsgenie);

    expect(opsgenie?.properties?.priority).toBe(true);
  });

  it('avoids empty-object property schemas that Mongoose minimize would strip', () => {
    for (const providerId of [ToolProviderIdEnum.PagerDuty, ToolProviderIdEnum.Opsgenie]) {
      const subschema = getProviderSubschema(providerId);
      for (const [key, value] of Object.entries(subschema?.properties ?? {})) {
        expect(value, `${providerId}.${key}`).not.toEqual({});
        expect(value, `${providerId}.${key}`).toBe(true);
      }
    }
  });

  it('keeps provider override fields under Ajv removeAdditional: failing', () => {
    const ajv = new Ajv({ useDefaults: true, removeAdditional: 'failing', strict: false });
    addFormats(ajv);
    const validate = ajv.compile(toolControlSchema);

    const controls = {
      body: 'default text as',
      providerOverrides: {
        [ToolProviderIdEnum.Opsgenie]: {
          alias: 'asd',
          priority: '{{payload.priority}}',
        },
        [ToolProviderIdEnum.PagerDuty]: {
          summary: '{{subscriber.avatar}}',
          links: [{ ads: 'asda' }],
        },
      },
    };

    const valid = validate(controls);

    expect(valid).toBe(true);
    expect(controls.providerOverrides[ToolProviderIdEnum.Opsgenie]).toEqual({
      alias: 'asd',
      priority: '{{payload.priority}}',
    });
    expect(controls.providerOverrides[ToolProviderIdEnum.PagerDuty]).toEqual({
      summary: '{{subscriber.avatar}}',
      links: [{ ads: 'asda' }],
    });
  });
});
