import { describe, expect, it } from 'vitest';
import {
  getOnDemandCost,
  getPauseAtLimitDescription,
  getUsageAlertsDescription,
  pausesOnSave,
} from './usage-limits-form-values';

const INCLUDED = 30000;

describe('usage-limits-form-values', () => {
  describe('getOnDemandCost', () => {
    it('prices the whole on-demand limit', () => {
      expect(getOnDemandCost(5000, 1.2)).toBe('$6.00');
    });

    it('is null without a limit or a known price', () => {
      expect(getOnDemandCost(null, 1.2)).toBeNull();
      expect(getOnDemandCost(5000, null)).toBeNull();
    });
  });

  describe('getPauseAtLimitDescription', () => {
    it('explains the switch while pausing is off, even with a limit set', () => {
      expect(getPauseAtLimitDescription(INCLUDED, { onDemandLimit: 5000, pauseAtLimit: false })).toBe(
        'Sending stops until the cycle resets. When off, usage continues and is billed on-demand.'
      );
    });

    it('names the included runs without an on-demand limit', () => {
      const expected = 'Sending stops at your 30,000 included runs until the cycle resets.';

      expect(getPauseAtLimitDescription(INCLUDED, { onDemandLimit: null, pauseAtLimit: true })).toBe(expected);
      expect(getPauseAtLimitDescription(INCLUDED, { onDemandLimit: 0, pauseAtLimit: true })).toBe(expected);
    });

    it('breaks down the threshold with an on-demand limit', () => {
      expect(getPauseAtLimitDescription(INCLUDED, { onDemandLimit: 5000, pauseAtLimit: true })).toBe(
        'Sending stops at 35,000 runs (30,000 included + 5,000 on-demand) until the cycle resets.'
      );
    });
  });

  describe('getUsageAlertsDescription', () => {
    it('alerts from 0 when the limit is the included runs', () => {
      const expected = 'Email and inbox alerts at 75%, 90% and 100% of your included runs.';

      expect(getUsageAlertsDescription(INCLUDED, { onDemandLimit: 0, pauseAtLimit: false })).toBe(expected);
      expect(getUsageAlertsDescription(INCLUDED, { onDemandLimit: null, pauseAtLimit: true })).toBe(expected);
    });

    it('alerts when included usage runs out under a higher limit', () => {
      expect(getUsageAlertsDescription(INCLUDED, { onDemandLimit: 5000, pauseAtLimit: true })).toBe(
        'Email and inbox alerts when included usage runs out, and at 75%, 90% and 100% of the limit.'
      );
    });

    it('only flags unusually high usage without a limit', () => {
      expect(getUsageAlertsDescription(INCLUDED, { onDemandLimit: null, pauseAtLimit: false })).toBe(
        'Email and inbox alerts if usage is much higher than typical for your plan.'
      );
    });
  });

  describe('pausesOnSave', () => {
    const pausing = { onDemandLimit: 5000, pauseAtLimit: true };

    it('warns when usage already reached the new threshold', () => {
      expect(pausesOnSave({ state: 'billed_on_demand', current: 35000, included: INCLUDED }, pausing)).toBe(true);
      expect(
        pausesOnSave(
          { state: 'within_included', current: INCLUDED, included: INCLUDED },
          { onDemandLimit: null, pauseAtLimit: true }
        )
      ).toBe(true);
    });

    it('does not warn below the threshold, when not pausing, or when already paused', () => {
      expect(pausesOnSave({ state: 'billed_on_demand', current: 34999, included: INCLUDED }, pausing)).toBe(false);
      expect(
        pausesOnSave(
          { state: 'billed_on_demand', current: 40000, included: INCLUDED },
          { ...pausing, pauseAtLimit: false }
        )
      ).toBe(false);
      expect(pausesOnSave({ state: 'paused', current: 40000, included: INCLUDED }, pausing)).toBe(false);
    });
  });
});
