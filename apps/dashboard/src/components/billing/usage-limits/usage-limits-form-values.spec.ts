import { ApiServiceLevelEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import {
  formatCompactUsd,
  formatWholeUsd,
  getOnDemandCost,
  getPauseAtLimitDescription,
  getTierSuggestion,
  getUsageAlertsDescription,
  getUsageTierSuggestion,
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

    it('compacts large on-demand totals', () => {
      expect(getOnDemandCost(123_123_123, 1.2)).toBe('$147.7k');
    });
  });

  describe('formatWholeUsd', () => {
    it('rounds to whole dollars with thousands separators', () => {
      expect(formatWholeUsd(250)).toBe('$250');
      expect(formatWholeUsd(1234.5)).toBe('$1,235');
    });
  });

  describe('formatCompactUsd', () => {
    it('keeps small amounts in whole dollars and compacts thousands', () => {
      expect(formatCompactUsd(250)).toBe('$250');
      expect(formatCompactUsd(147_777.75)).toBe('$147.8k');
    });

    it('rounds before choosing the compact form', () => {
      expect(formatCompactUsd(999.4)).toBe('$999');
      expect(formatCompactUsd(999.5)).toBe('$1k');
    });
  });

  describe('getTierSuggestion', () => {
    const suggest = (apiServiceLevel: ApiServiceLevelEnum, onDemandLimit: number | null, onDemandPricePer1k = 2) =>
      getTierSuggestion({
        apiServiceLevel,
        isOnTrial: false,
        onDemandLimit,
        onDemandPricePer1k,
        included: INCLUDED,
      });

    it('suggests Team once Team at the same limit costs less and stays under $600', () => {
      expect(suggest(ApiServiceLevelEnum.PRO, 110_000)).toBeNull();
      expect(suggest(ApiServiceLevelEnum.PRO, 110_500)).toEqual({
        kind: 'upgrade_to_teams',
        monthlyCost: 251,
        teamsCost: 250,
      });
    });

    it('prices Team at the same run volume, not at the $250 base price', () => {
      expect(suggest(ApiServiceLevelEnum.PRO, 200_000)).toEqual({
        kind: 'upgrade_to_teams',
        monthlyCost: 430,
        teamsCost: 250,
      });
    });

    it('suggests Enterprise once Team at the same limit reaches $600', () => {
      expect(suggest(ApiServiceLevelEnum.PRO, 394_500)).toEqual({
        kind: 'upgrade_to_teams',
        monthlyCost: 819,
        teamsCost: 599,
      });
      expect(suggest(ApiServiceLevelEnum.PRO, 395_000)).toEqual({
        kind: 'contact_sales',
        monthlyCost: 820,
        fromPlan: 'PRO',
      });
    });

    it('suggests Enterprise when Team rounds up to $600', () => {
      expect(suggest(ApiServiceLevelEnum.PRO, 394_750)).toEqual({
        kind: 'contact_sales',
        monthlyCost: 820,
        fromPlan: 'PRO',
      });
    });

    it('suggests Enterprise when a huge Pro limit would barely save on Team', () => {
      const suggestion = suggest(ApiServiceLevelEnum.PRO, 123_123_123, 1.2);

      expect(suggestion).toMatchObject({ kind: 'contact_sales', fromPlan: 'PRO' });
      expect(suggestion && formatCompactUsd(suggestion.monthlyCost)).toBe('$147.8k');
    });

    it('suggests contacting sales once Teams plus on-demand reaches $600', () => {
      expect(suggest(ApiServiceLevelEnum.BUSINESS, 174_749)).toBeNull();
      expect(suggest(ApiServiceLevelEnum.BUSINESS, 175_000)).toEqual({
        kind: 'contact_sales',
        monthlyCost: 600,
        fromPlan: 'TEAM',
      });
    });

    it('suggests nothing on a trial, without a positive limit, or without a known price', () => {
      expect(
        getTierSuggestion({
          apiServiceLevel: ApiServiceLevelEnum.PRO,
          isOnTrial: true,
          onDemandLimit: 1_000_000,
          onDemandPricePer1k: 2,
          included: INCLUDED,
        })
      ).toBeNull();
      expect(suggest(ApiServiceLevelEnum.BUSINESS, null)).toBeNull();
      expect(suggest(ApiServiceLevelEnum.BUSINESS, 0)).toBeNull();
      expect(
        getTierSuggestion({
          apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
          isOnTrial: false,
          onDemandLimit: 1_000_000,
          onDemandPricePer1k: null,
          included: INCLUDED,
        })
      ).toBeNull();
    });

    it('suggests nothing on Free, Enterprise or Unlimited plans', () => {
      expect(suggest(ApiServiceLevelEnum.FREE, 1_000_000)).toBeNull();
      expect(suggest(ApiServiceLevelEnum.ENTERPRISE, 1_000_000)).toBeNull();
      expect(suggest(ApiServiceLevelEnum.UNLIMITED, 1_000_000)).toBeNull();
    });
  });

  describe('getUsageTierSuggestion', () => {
    const suggest = (apiServiceLevel: ApiServiceLevelEnum, current: number, isOnTrial = false) =>
      getUsageTierSuggestion({ apiServiceLevel, isOnTrial, current, included: INCLUDED, onDemandPricePer1k: 2 });

    it('suggests Team once usage so far prices Team lower and still under $600', () => {
      expect(suggest(ApiServiceLevelEnum.PRO, INCLUDED + 110_000)).toBeNull();
      expect(suggest(ApiServiceLevelEnum.PRO, INCLUDED + 123_500)).toEqual({
        kind: 'upgrade_to_teams',
        monthlyCost: 277,
        teamsCost: 250,
      });
    });

    it('suggests Enterprise once usage so far prices Team at $600 or more', () => {
      expect(suggest(ApiServiceLevelEnum.PRO, INCLUDED + 395_000)).toEqual({
        kind: 'contact_sales',
        monthlyCost: 820,
        fromPlan: 'PRO',
      });
    });

    it('suggests contacting sales once Teams plus on-demand so far reaches $600', () => {
      expect(suggest(ApiServiceLevelEnum.BUSINESS, INCLUDED + 174_749)).toBeNull();
      expect(suggest(ApiServiceLevelEnum.BUSINESS, INCLUDED + 195_000)).toEqual({
        kind: 'contact_sales',
        monthlyCost: 640,
        fromPlan: 'TEAM',
      });
    });

    it('suggests nothing within the included runs, on a trial, or without a known price', () => {
      expect(suggest(ApiServiceLevelEnum.BUSINESS, INCLUDED)).toBeNull();
      expect(suggest(ApiServiceLevelEnum.BUSINESS, INCLUDED + 1_000_000, true)).toBeNull();
      expect(
        getUsageTierSuggestion({
          apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
          isOnTrial: false,
          current: INCLUDED + 1_000_000,
          included: INCLUDED,
          onDemandPricePer1k: null,
        })
      ).toBeNull();
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
