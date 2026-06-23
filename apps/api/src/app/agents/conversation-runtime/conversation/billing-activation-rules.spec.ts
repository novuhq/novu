import {
  type ActivationRuleParams,
  buildActivationOrConditions,
  ConversationActivationReasonEnum,
  type ConversationBillingState,
  classifyActivationReason,
} from '@novu/dal';
import { expect } from 'chai';

/**
 * Locks the single source of truth: `classifyActivationReason` (the in-memory
 * gate predicate) must agree with `buildActivationOrConditions` (the atomic
 * Mongo write-claim). If the two ever diverge, counting silently breaks in prod
 * with no type error — this test fails by construction instead.
 */
describe('billing-activation-rules #novu-v2', () => {
  const PERIOD = '2026-06';
  const THRESHOLD = '2026-06-15T00:00:00.000Z'; // engagements before this are window-expired
  const params: ActivationRuleParams = { periodKey: PERIOD, windowThresholdIso: THRESHOLD };

  // Minimal faithful simulation of the MongoDB operators the rules emit,
  // applied to an in-memory billing object (mirrors Mongo's missing-field semantics).
  function evalFragment(fragment: Record<string, unknown>, billing: ConversationBillingState | undefined): boolean {
    const [path, condition] = Object.entries(fragment)[0] as [string, Record<string, unknown>];
    const field = path.replace('billing.', '') as keyof ConversationBillingState;
    const value = billing?.[field];

    if ('$exists' in condition) {
      return condition.$exists ? value !== undefined : value === undefined;
    }
    if ('$ne' in condition) {
      // Mongo: a missing field also satisfies $ne.
      return value !== condition.$ne;
    }
    if ('$lt' in condition) {
      return typeof value === 'string' && value < (condition.$lt as string);
    }

    throw new Error(`Unsupported operator in fragment: ${JSON.stringify(condition)}`);
  }

  function orMatches(billing: ConversationBillingState | undefined): boolean {
    return buildActivationOrConditions(params).some((fragment) => evalFragment(fragment, billing));
  }

  const cases: Array<{ name: string; billing: ConversationBillingState | undefined }> = [
    { name: 'no billing (brand new)', billing: undefined },
    { name: 'empty billing', billing: {} },
    {
      name: 'counted this period, recent engagement',
      billing: { lastCountedPeriodKey: PERIOD, lastEngagementAt: '2026-06-20T00:00:00.000Z' },
    },
    {
      name: 'counted this period, stale engagement',
      billing: { lastCountedPeriodKey: PERIOD, lastEngagementAt: '2026-06-01T00:00:00.000Z' },
    },
    {
      name: 'counted a previous period',
      billing: { lastCountedPeriodKey: '2026-05', lastEngagementAt: '2026-06-20T00:00:00.000Z' },
    },
    {
      name: 'resolved since last count',
      billing: {
        lastCountedPeriodKey: PERIOD,
        lastEngagementAt: '2026-06-20T00:00:00.000Z',
        resolvedAt: '2026-06-21T00:00:00.000Z',
      },
    },
    { name: 'counted, no engagement timestamp', billing: { lastCountedPeriodKey: PERIOD } },
  ];

  it('classify and the Mongo $or agree on whether to count, across the state matrix', () => {
    for (const { name, billing } of cases) {
      const classified = classifyActivationReason(billing, params) !== null;
      const matched = orMatches(billing);

      expect(classified, `mismatch for "${name}" (classify=${classified}, $or=${matched})`).to.equal(matched);
    }
  });

  it('returns the highest-priority reason (NEW > REOPEN > NEW_CYCLE > WINDOW_EXPIRED)', () => {
    expect(classifyActivationReason(undefined, params)).to.equal(ConversationActivationReasonEnum.NEW);

    // resolved wins over an otherwise-quiet, same-period conversation
    expect(
      classifyActivationReason(
        {
          lastCountedPeriodKey: PERIOD,
          lastEngagementAt: '2026-06-20T00:00:00.000Z',
          resolvedAt: '2026-06-21T00:00:00.000Z',
        },
        params
      )
    ).to.equal(ConversationActivationReasonEnum.REOPEN);

    expect(
      classifyActivationReason(
        { lastCountedPeriodKey: '2026-05', lastEngagementAt: '2026-06-20T00:00:00.000Z' },
        params
      )
    ).to.equal(ConversationActivationReasonEnum.NEW_CYCLE);

    expect(
      classifyActivationReason({ lastCountedPeriodKey: PERIOD, lastEngagementAt: '2026-06-01T00:00:00.000Z' }, params)
    ).to.equal(ConversationActivationReasonEnum.WINDOW_EXPIRED);
  });

  it('does not count an active conversation inside its window and period', () => {
    expect(
      classifyActivationReason({ lastCountedPeriodKey: PERIOD, lastEngagementAt: '2026-06-20T00:00:00.000Z' }, params)
    ).to.equal(null);
  });
});
