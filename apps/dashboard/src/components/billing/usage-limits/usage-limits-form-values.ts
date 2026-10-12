import {
  ApiServiceLevelEnum,
  FeatureNameEnum,
  getFeatureForTierAsNumber,
  getWorkflowRunLimit,
  type IOrganizationUsageLimits,
  MAX_ON_DEMAND_LIMIT,
  UsageAlertRecipientsEnum,
} from '@novu/shared';
import { z } from 'zod';
import { formatNumber } from '@/utils/number-formatting';
import type { WorkflowRunsUsage } from './usage-limits-view';

export const usageLimitsFormSchema = z.object({
  workflowRuns: z.object({
    onDemandLimit: z.number().int().min(0).max(MAX_ON_DEMAND_LIMIT).nullable(),
  }),
  pauseAtLimit: z.boolean(),
  alerts: z.object({
    enabled: z.boolean(),
    sendTo: z.enum(UsageAlertRecipientsEnum),
  }),
});

export type UsageLimitsFormValues = z.infer<typeof usageLimitsFormSchema>;

export type WorkflowRunLimitSettings = Pick<IOrganizationUsageLimits, 'workflowRuns' | 'pauseAtLimit'>;

const usdFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const wholeUsdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const compactUsdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

export function formatWholeUsd(amount: number): string {
  return wholeUsdFormatter.format(amount);
}

/** `$250` stays whole; `$147,778` becomes `$147.8k`. */
export function formatCompactUsd(amount: number): string {
  if (Math.abs(amount) < 1_000) {
    return formatWholeUsd(amount);
  }

  return compactUsdFormatter.format(amount).toLowerCase();
}

/** Usage at which new workflow runs pause; null when they never pause. */
function getPauseThreshold(included: number, settings: WorkflowRunLimitSettings): number | null {
  return settings.pauseAtLimit ? getWorkflowRunLimit(included, settings) : null;
}

function getOnDemandSpend(onDemandLimit: number, onDemandPricePer1k: number): number {
  return (onDemandLimit / 1000) * onDemandPricePer1k;
}

/** USD cost of using the whole on-demand limit; null without a limit or a known price. */
export function getOnDemandCost(onDemandLimit: number | null, onDemandPricePer1k: number | null): string | null {
  if (onDemandLimit === null || onDemandPricePer1k === null) {
    return null;
  }

  const spend = getOnDemandSpend(onDemandLimit, onDemandPricePer1k);

  if (spend >= 1_000) {
    return formatCompactUsd(spend);
  }

  return usdFormatter.format(spend);
}

/** `monthlyCost` is the plan price plus on-demand, at the limit or so far this cycle depending on the caller. */
export type TierSuggestion =
  | { kind: 'upgrade_to_teams'; monthlyCost: number; teamsCost: number }
  | { kind: 'contact_sales'; monthlyCost: number; fromPlan: 'PRO' | 'TEAM' };

export const CONTACT_SALES_MONTHLY_COST_THRESHOLD = 600;

const TEAMS_MONTHLY_COST = getFeatureForTierAsNumber(
  FeatureNameEnum.PLATFORM_MONTHLY_COST,
  ApiServiceLevelEnum.BUSINESS,
  false
);

const TEAMS_INCLUDED_RUNS = getFeatureForTierAsNumber(
  FeatureNameEnum.PLATFORM_MONTHLY_EVENTS_INCLUDED,
  ApiServiceLevelEnum.BUSINESS,
  false
);

/** Plan monthly list price, even on annual billing, plus the on-demand spend. */
function getMonthlyCost(apiServiceLevel: ApiServiceLevelEnum, onDemandSpend: number): number {
  return getFeatureForTierAsNumber(FeatureNameEnum.PLATFORM_MONTHLY_COST, apiServiceLevel, false) + onDemandSpend;
}

/**
 * Suggests Team when Team's price at this run volume is lower by at least a dollar and still under $600.
 * Once the cost reaches $600, suggests Enterprise. Never on a trial or without a positive limit.
 */
export function getTierSuggestion({
  apiServiceLevel,
  isOnTrial,
  onDemandLimit,
  onDemandPricePer1k,
  included,
}: {
  apiServiceLevel: ApiServiceLevelEnum;
  isOnTrial: boolean;
  onDemandLimit: number | null;
  onDemandPricePer1k: number | null;
  included: number;
}): TierSuggestion | null {
  if (isOnTrial || onDemandLimit === null || onDemandLimit <= 0 || onDemandPricePer1k === null) {
    return null;
  }

  return suggestTierForMonthlyCost({
    apiServiceLevel,
    monthlyCost: getMonthlyCost(apiServiceLevel, getOnDemandSpend(onDemandLimit, onDemandPricePer1k)),
    totalRuns: included + onDemandLimit,
    onDemandPricePer1k,
  });
}

/** Same thresholds as `getTierSuggestion`, priced on the runs used so far this cycle. */
export function getUsageTierSuggestion({
  apiServiceLevel,
  isOnTrial,
  current,
  included,
  onDemandPricePer1k,
}: {
  apiServiceLevel: ApiServiceLevelEnum;
  isOnTrial: boolean;
  current: number;
  included: number;
  onDemandPricePer1k: number | null;
}): TierSuggestion | null {
  if (isOnTrial || onDemandPricePer1k === null || current <= included) {
    return null;
  }

  return suggestTierForMonthlyCost({
    apiServiceLevel,
    monthlyCost: getMonthlyCost(apiServiceLevel, getOnDemandSpend(current - included, onDemandPricePer1k)),
    totalRuns: current,
    onDemandPricePer1k,
  });
}

export function getTeamsSavings(monthlyCost: number, teamsCost: number): number {
  return monthlyCost - teamsCost;
}

/** Team list price plus on-demand above Team's included runs, at the same per-1k rate. */
function getTeamsMonthlyCost(totalRuns: number, onDemandPricePer1k: number): number {
  const onDemandRuns = Math.max(0, totalRuns - TEAMS_INCLUDED_RUNS);

  return TEAMS_MONTHLY_COST + getOnDemandSpend(onDemandRuns, onDemandPricePer1k);
}

function suggestTierForMonthlyCost({
  apiServiceLevel,
  monthlyCost,
  totalRuns,
  onDemandPricePer1k,
}: {
  apiServiceLevel: ApiServiceLevelEnum;
  monthlyCost: number;
  totalRuns: number;
  onDemandPricePer1k: number;
}): TierSuggestion | null {
  switch (apiServiceLevel) {
    case ApiServiceLevelEnum.PRO: {
      const teamsCost = getTeamsMonthlyCost(totalRuns, onDemandPricePer1k);
      const teamsSavesADollar = Math.round(getTeamsSavings(monthlyCost, teamsCost)) >= 1;

      if (teamsSavesADollar && teamsCost < CONTACT_SALES_MONTHLY_COST_THRESHOLD) {
        return { kind: 'upgrade_to_teams', monthlyCost, teamsCost };
      }

      if (monthlyCost >= CONTACT_SALES_MONTHLY_COST_THRESHOLD) {
        return { kind: 'contact_sales', monthlyCost, fromPlan: 'PRO' };
      }

      return null;
    }
    case ApiServiceLevelEnum.BUSINESS:
      if (monthlyCost >= CONTACT_SALES_MONTHLY_COST_THRESHOLD) {
        return { kind: 'contact_sales', monthlyCost, fromPlan: 'TEAM' };
      }

      return null;
    case ApiServiceLevelEnum.FREE:
    case ApiServiceLevelEnum.ENTERPRISE:
    case ApiServiceLevelEnum.UNLIMITED:
      return null;
    default: {
      const exhaustiveCheck: never = apiServiceLevel;

      return exhaustiveCheck;
    }
  }
}

export function getPauseAtLimitDescription(included: number, settings: WorkflowRunLimitSettings) {
  const pauseThreshold = getPauseThreshold(included, settings);

  if (pauseThreshold === null) {
    return 'Sending stops until the cycle resets. When off, usage continues and is billed on-demand.';
  }

  if (pauseThreshold === included) {
    return `Sending stops at your ${formatNumber(included)} included runs until the cycle resets.`;
  }

  return `Sending stops at ${formatNumber(pauseThreshold)} runs (${formatNumber(included)} included + ${formatNumber(pauseThreshold - included)} on-demand) until the cycle resets.`;
}

/**
 * Usage alerts measure from the included runs under a higher limit, and from 0 when the limit is the included runs.
 * Without a limit they only flag usage far above the plan's typical volume.
 */
export function getUsageAlertsDescription(
  included: number,
  settings: WorkflowRunLimitSettings,
  allowanceOverride: number | null = null
) {
  if (allowanceOverride !== null) {
    const { onDemandLimit } = settings.workflowRuns;

    if (onDemandLimit !== null && onDemandLimit > 0) {
      return `Email and inbox alerts at the ${formatNumber(allowanceOverride)} usage alert cap, and at 75%, 90% and 100% of the ${formatNumber(onDemandLimit)} on-demand runs above it.`;
    }

    return `Email and inbox alerts at 75%, 90% and 100% of the ${formatNumber(allowanceOverride)} usage alert cap.`;
  }

  const limit = getWorkflowRunLimit(included, settings);

  if (limit === null) {
    return 'Email and inbox alerts if usage is much higher than typical for your plan.';
  }

  if (limit === included) {
    return 'Email and inbox alerts at 75%, 90% and 100% of your included runs.';
  }

  return 'Email and inbox alerts when included usage runs out, and at 75%, 90% and 100% of the limit.';
}

export function pausesOnSave(
  usage: Pick<WorkflowRunsUsage, 'state' | 'current' | 'included'>,
  settings: WorkflowRunLimitSettings
): boolean {
  const pauseThreshold = getPauseThreshold(usage.included, settings);

  return usage.state !== 'paused' && pauseThreshold !== null && usage.current >= pauseThreshold;
}
