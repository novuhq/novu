import { ToolProviderIdEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import { toolControlZodSchema } from './tool-control.schema';

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
      enabledIntegrations: ['pd-prod'],
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
