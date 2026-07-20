import { ResourceOriginEnum, StepTypeEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import { toolControlSchema } from '../schemas/control';
import { resolveStepControlSchemas, stepTypeToControlSchema } from './step-type-to-control.mapper';

describe('resolveStepControlSchemas', () => {
  it('uses the canonical schema for dashboard cloud steps without a step resolver', () => {
    const staleControls = {
      schema: {
        type: 'object',
        properties: {
          body: { type: 'string' },
          providerOverrides: {
            type: 'object',
            properties: {
              opsgenie: { type: 'object' },
            },
          },
        },
        required: ['body'],
      },
    };

    const resolved = resolveStepControlSchemas({
      stepType: StepTypeEnum.TOOL,
      workflowOrigin: ResourceOriginEnum.NOVU_CLOUD,
      existingControls: staleControls as any,
    });

    expect(resolved.schema).toBe(toolControlSchema);
    expect(resolved).toBe(stepTypeToControlSchema[StepTypeEnum.TOOL]);
  });

  it('keeps the stored schema for code-first workflows', () => {
    const discoveredControls = {
      schema: {
        type: 'object',
        properties: {
          customField: { type: 'string' },
        },
      },
    };

    const resolved = resolveStepControlSchemas({
      stepType: StepTypeEnum.TOOL,
      workflowOrigin: ResourceOriginEnum.EXTERNAL,
      existingControls: discoveredControls as any,
    });

    expect(resolved).toBe(discoveredControls);
  });

  it('keeps the stored schema when a step resolver is active', () => {
    const resolverControls = {
      schema: {
        type: 'object',
        properties: {
          resolverOnly: { type: 'string' },
        },
      },
    };

    const resolved = resolveStepControlSchemas({
      stepType: StepTypeEnum.EMAIL,
      workflowOrigin: ResourceOriginEnum.NOVU_CLOUD,
      existingControls: resolverControls as any,
      stepResolverHash: 'abc123',
    });

    expect(resolved).toBe(resolverControls);
  });
});
