import { ResourceOriginEnum, StepTypeEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import { resolveStepControlSchemas } from '../../utils/step-type-to-control.mapper';
import { toolControlSchema, toolControlZodSchema } from './tool-control.schema';

describe('toolControlZodSchema', () => {
  it('accepts default tool controls', () => {
    const result = toolControlZodSchema.safeParse({
      body: 'MemoryDB alert',
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

  it('rejects nested providerOverrides on the main control value', () => {
    const result = toolControlZodSchema.safeParse({
      body: 'MemoryDB alert',
      providerOverrides: {
        pagerduty: { severity: 'warning' },
      },
    });

    expect(result.success).toBe(false);
  });
});

describe('toolControlSchema (generated JSON schema)', () => {
  it('does not include providerOverrides on the main control schema', () => {
    expect(toolControlSchema.properties?.providerOverrides).toBeUndefined();
    expect(Object.keys(toolControlSchema.properties ?? {}).sort()).toEqual(['body', 'skip']);
  });

  it('resolves mongoose-stripped persisted schemas to the canonical schema without providerOverrides', () => {
    const strippedControls = {
      schema: {
        type: 'object',
        properties: {
          body: { type: 'string' },
        },
        required: ['body'],
        additionalProperties: false,
      },
    };

    const resolved = resolveStepControlSchemas({
      stepType: StepTypeEnum.TOOL,
      workflowOrigin: ResourceOriginEnum.NOVU_CLOUD,
      existingControls: strippedControls as never,
    });

    expect(resolved.schema).toBe(toolControlSchema);
    expect(resolved.schema.properties?.providerOverrides).toBeUndefined();
  });
});
