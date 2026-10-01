import { describe, expect, it } from 'vitest';
import {
  getOnDemandCost,
  getPauseAtLimitDescription,
  getPauseThreshold,
  pausesOnSave,
} from './usage-limits-form-values';

const INCLUDED = 30000;

describe('usage-limits-form-values', () => {
  describe('getPauseThreshold', () => {
    it('is null when not pausing', () => {
      expect(getPauseThreshold(INCLUDED, { onDemandLimit: 5000, pauseAtLimit: false })).toBeNull();
    });

    it('pauses at the included runs without an on-demand limit', () => {
      expect(getPauseThreshold(INCLUDED, { onDemandLimit: null, pauseAtLimit: true })).toBe(30000);
      expect(getPauseThreshold(INCLUDED, { onDemandLimit: 0, pauseAtLimit: true })).toBe(30000);
    });

    it('adds the on-demand limit to the included runs', () => {
      expect(getPauseThreshold(INCLUDED, { onDemandLimit: 5000, pauseAtLimit: true })).toBe(35000);
    });
  });

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

  describe('pausesOnSave', () => {
    const pausing = { onDemandLimit: 5000, pauseAtLimit: true };

    it('warns when usage already reached the new threshold', () => {
      expect(pausesOnSave({ state: 'billed_on_demand', current: 35000, included: INCLUDED }, pausing)).toBe(true);
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
