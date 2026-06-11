import { describe, expectTypeOf, it } from 'vitest';
import { step } from './step';

describe('step-resolver', () => {
  it('should compile handlers that use ctx without TS2589', () => {
    step.email('my-step', async (_controls, { payload }) => ({
      subject: String(Object.keys(payload).length),
      body: 'y',
    }));

    step.email('my-step', async (_controls, ctx) => ({
      subject: String(Object.keys(ctx.payload).length),
      body: 'y',
    }));
  });

  it('should type payload as Record<string, unknown> by default', () => {
    step.email('my-step', async (_controls, { payload }) => {
      expectTypeOf(payload).toEqualTypeOf<Record<string, unknown>>();

      return { subject: 'x', body: 'y' };
    });
  });
});
