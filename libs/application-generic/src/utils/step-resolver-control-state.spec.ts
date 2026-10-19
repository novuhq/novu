import { describe, expect, it } from 'vitest';
import { reconcileStepResolverControlValues } from './step-resolver-control-state';

describe('reconcileStepResolverControlValues', () => {
  it('compiles and validates JSON Schema draft 2020-12 control schemas', () => {
    const reconciled = reconcileStepResolverControlValues(
      { staleField: 'remove-me', subject: 'hello' },
      {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          subject: { type: 'string', minLength: 1 },
        },
        required: ['subject'],
        additionalProperties: false,
      }
    );

    expect(reconciled).toEqual({ subject: 'hello' });
  });
});
