import { describe, expect, it } from 'vitest';
import {
  getOnDemandCost,
  getPauseAtLimitDescription,
  getUsageAlertsDescription,
  pausesOnSave,
  type WorkflowRunLimitSettings,
} from './usage-limits-form-values';

const INCLUDED = 30000;

function settings(onDemandLimit: number | null, pauseAtLimit: boolean): WorkflowRunLimitSettings {
  return { workflowRuns: { onDemandLimit }, pauseAtLimit };
}

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
      expect(getPauseAtLimitDescription(INCLUDED, settings(5000, false))).toBe(
        'Sending stops until the cycle resets. When off, usage continues and is billed on-demand.'
      );
    });

    it('names the included runs without an on-demand limit', () => {
      const expected = 'Sending stops at your 30,000 included runs until the cycle resets.';

      expect(getPauseAtLimitDescription(INCLUDED, settings(null, true))).toBe(expected);
      expect(getPauseAtLimitDescription(INCLUDED, settings(0, true))).toBe(expected);
    });

    it('breaks down the threshold with an on-demand limit', () => {
      expect(getPauseAtLimitDescription(INCLUDED, settings(5000, true))).toBe(
        'Sending stops at 35,000 runs (30,000 included + 5,000 on-demand) until the cycle resets.'
      );
    });
  });

  describe('getUsageAlertsDescription', () => {
    it('alerts from 0 when the limit is the included runs', () => {
      const expected = 'Email and inbox alerts at 75%, 90% and 100% of your included runs.';

      expect(getUsageAlertsDescription(INCLUDED, settings(0, false))).toBe(expected);
      expect(getUsageAlertsDescription(INCLUDED, settings(null, true))).toBe(expected);
    });

    it('alerts when included usage runs out under a higher limit', () => {
      expect(getUsageAlertsDescription(INCLUDED, settings(5000, true))).toBe(
        'Email and inbox alerts when included usage runs out, and at 75%, 90% and 100% of the limit.'
      );
    });

    it('only flags unusually high usage without a limit', () => {
      expect(getUsageAlertsDescription(INCLUDED, settings(null, false))).toBe(
        'Email and inbox alerts if usage is much higher than typical for your plan.'
      );
    });

    it('measures thresholds from 0 to the usage alert cap override without an on-demand limit', () => {
      const expected = 'Email and inbox alerts at 75%, 90% and 100% of the 20 usage alert cap.';

      expect(getUsageAlertsDescription(INCLUDED, settings(null, false), 20)).toBe(expected);
      expect(getUsageAlertsDescription(INCLUDED, settings(null, true), 20)).toBe(expected);
      expect(getUsageAlertsDescription(INCLUDED, settings(0, true), 20)).toBe(expected);
    });

    it('alerts at the usage alert cap override and along the on-demand runs above it', () => {
      expect(getUsageAlertsDescription(INCLUDED, settings(10, false), 20)).toBe(
        'Email and inbox alerts at the 20 usage alert cap, and at 75%, 90% and 100% of the 10 on-demand runs above it.'
      );
    });
  });

  describe('pausesOnSave', () => {
    const pausing = settings(5000, true);

    it('warns when usage already reached the new threshold', () => {
      expect(pausesOnSave({ state: 'billed_on_demand', current: 35000, included: INCLUDED }, pausing)).toBe(true);
      expect(
        pausesOnSave({ state: 'within_included', current: INCLUDED, included: INCLUDED }, settings(null, true))
      ).toBe(true);
    });

    it('does not warn below the threshold, when not pausing, or when already paused', () => {
      expect(pausesOnSave({ state: 'billed_on_demand', current: 34999, included: INCLUDED }, pausing)).toBe(false);
      expect(
        pausesOnSave({ state: 'billed_on_demand', current: 40000, included: INCLUDED }, settings(5000, false))
      ).toBe(false);
      expect(pausesOnSave({ state: 'paused', current: 40000, included: INCLUDED }, pausing)).toBe(false);
    });
  });
});
