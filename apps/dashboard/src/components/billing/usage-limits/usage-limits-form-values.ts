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

export function formatUsd(amount: number): string {
  return usdFormatter.format(amount);
}

/** Usage at which new workflow runs pause; null when they never pause. */
function getPauseThreshold(included: number, settings: WorkflowRunLimitSettings): number | null {
  return settings.pauseAtLimit ? getWorkflowRunLimit(included, settings) : null;
}

function getOnDemandSpend(onDemandLimit: number | null, onDemandPricePer1k: number | null): number | null {
  if (onDemandLimit === null || onDemandPricePer1k === null) {
    return null;
  }

  return (onDemandLimit / 1000) * onDemandPricePer1k;
}

/** USD cost of using the whole on-demand limit; null without a limit or a known price. */
export function getOnDemandCost(onDemandLimit: number | null, onDemandPricePer1k: number | null): string | null {
  const spend = getOnDemandSpend(onDemandLimit, onDemandPricePer1k);

  return spend === null ? null : formatUsd(spend);
}

/**
 * Plan monthly list price, even on annual billing, plus the cost of the whole on-demand limit.
 * Only meaningful for tiers with a numeric list price; custom-priced tiers count as $0.
 */
export function getMonthlyCostAtLimit(
  apiServiceLevel: ApiServiceLevelEnum,
  onDemandLimit: number | null,
  onDemandPricePer1k: number | null
): number | null {
  const spend = getOnDemandSpend(onDemandLimit, onDemandPricePer1k);

  if (spend === null) {
    return null;
  }

  return getFeatureForTierAsNumber(FeatureNameEnum.PLATFORM_MONTHLY_COST, apiServiceLevel, false) + spend;
}

export type TierSuggestion = 'upgrade_to_teams' | 'contact_sales';

export const CONTACT_SALES_MONTHLY_COST_THRESHOLD = 600;

export const TEAMS_MONTHLY_COST = getFeatureForTierAsNumber(
  FeatureNameEnum.PLATFORM_MONTHLY_COST,
  ApiServiceLevelEnum.BUSINESS,
  false
);

type NextTierThreshold = { suggestion: TierSuggestion; monthlyCost: number };

function getNextTierThreshold(apiServiceLevel: ApiServiceLevelEnum): NextTierThreshold | null {
  switch (apiServiceLevel) {
    case ApiServiceLevelEnum.PRO:
      return { suggestion: 'upgrade_to_teams', monthlyCost: TEAMS_MONTHLY_COST };
    case ApiServiceLevelEnum.BUSINESS:
      return { suggestion: 'contact_sales', monthlyCost: CONTACT_SALES_MONTHLY_COST_THRESHOLD };
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

/** Next step up once the plan price plus on-demand at the limit reaches it; never on a trial or without a positive limit. */
export function getTierSuggestion({
  apiServiceLevel,
  isOnTrial,
  onDemandLimit,
  onDemandPricePer1k,
}: {
  apiServiceLevel: ApiServiceLevelEnum;
  isOnTrial: boolean;
  onDemandLimit: number | null;
  onDemandPricePer1k: number | null;
}): TierSuggestion | null {
  if (isOnTrial || onDemandLimit === null || onDemandLimit <= 0) {
    return null;
  }

  const next = getNextTierThreshold(apiServiceLevel);

  if (!next) {
    return null;
  }

  const monthlyCost = getMonthlyCostAtLimit(apiServiceLevel, onDemandLimit, onDemandPricePer1k);

  if (monthlyCost === null || monthlyCost < next.monthlyCost) {
    return null;
  }

  return next.suggestion;
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
