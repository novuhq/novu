import { describe, expect, it } from 'vitest';
import { buildContextTypeVariables } from './use-context-type-variables';

describe('buildContextTypeVariables', () => {
  it('preserves the runtime types of context data fields', () => {
    const variables = buildContextTypeVariables([
      {
        type: 'tenant',
        data: {
          retries: 3,
          enabled: true,
          tags: ['enterprise'],
          settings: {
            threshold: 10,
          },
          nullable: null,
        },
      },
    ]);

    expect(variables).toEqual([
      { name: 'context.tenant.id', dataType: 'string' },
      { name: 'context.tenant.data', dataType: 'object' },
      { name: 'context.tenant.data.retries', dataType: 'number' },
      { name: 'context.tenant.data.enabled', dataType: 'boolean' },
      { name: 'context.tenant.data.tags', dataType: 'array' },
      { name: 'context.tenant.data.settings', dataType: 'object' },
      { name: 'context.tenant.data.settings.threshold', dataType: 'number' },
      { name: 'context.tenant.data.nullable', dataType: 'string' },
    ]);
  });
});
