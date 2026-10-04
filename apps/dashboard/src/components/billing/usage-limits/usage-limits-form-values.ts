import {
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

/** Usage at which new workflow runs pause; null when they never pause. */
function getPauseThreshold(included: number, settings: WorkflowRunLimitSettings): number | null {
  return settings.pauseAtLimit ? getWorkflowRunLimit(included, settings) : null;
}

/** USD cost of using the whole on-demand limit; null without a limit or a known price. */
export function getOnDemandCost(onDemandLimit: number | null, onDemandPricePer1k: number | null): string | null {
  if (onDemandLimit === null || onDemandPricePer1k === null) {
    return null;
  }

  return usdFormatter.format((onDemandLimit / 1000) * onDemandPricePer1k);
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
export function getUsageAlertsDescription(included: number, settings: WorkflowRunLimitSettings) {
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
