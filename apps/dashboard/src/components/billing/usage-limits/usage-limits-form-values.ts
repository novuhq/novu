import { type IWorkflowRunsUsageLimit, MAX_ON_DEMAND_LIMIT, UsageAlertRecipientsEnum } from '@novu/shared';
import { z } from 'zod';
import { formatNumber } from '@/utils/number-formatting';
import type { WorkflowRunsUsage } from './usage-limits-view';

export const usageLimitsFormSchema = z.object({
  workflowRuns: z.object({
    onDemandLimit: z.number().int().min(0).max(MAX_ON_DEMAND_LIMIT).nullable(),
    pauseAtLimit: z.boolean(),
  }),
  alerts: z.object({
    enabled: z.boolean(),
    sendTo: z.enum(UsageAlertRecipientsEnum),
  }),
});

export type UsageLimitsFormValues = z.infer<typeof usageLimitsFormSchema>;

const usdFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** Usage at which new workflow runs pause; null when they never pause. */
export function getPauseThreshold(included: number, { onDemandLimit, pauseAtLimit }: IWorkflowRunsUsageLimit) {
  if (!pauseAtLimit) {
    return null;
  }

  return included + (onDemandLimit ?? 0);
}

/** USD cost of using the whole on-demand limit; null without a limit or a known price. */
export function getOnDemandCost(onDemandLimit: number | null, onDemandPricePer1k: number | null): string | null {
  if (onDemandLimit === null || onDemandPricePer1k === null) {
    return null;
  }

  return usdFormatter.format((onDemandLimit / 1000) * onDemandPricePer1k);
}

export function getPauseAtLimitDescription(included: number, { onDemandLimit, pauseAtLimit }: IWorkflowRunsUsageLimit) {
  if (!pauseAtLimit) {
    return 'Sending stops until the cycle resets. When off, usage continues and is billed on-demand.';
  }

  if (onDemandLimit === null || onDemandLimit === 0) {
    return `Sending stops at your ${formatNumber(included)} included runs until the cycle resets.`;
  }

  return `Sending stops at ${formatNumber(included + onDemandLimit)} runs (${formatNumber(included)} included + ${formatNumber(onDemandLimit)} on-demand) until the cycle resets.`;
}

export function pausesOnSave(
  usage: Pick<WorkflowRunsUsage, 'state' | 'current' | 'included'>,
  workflowRuns: IWorkflowRunsUsageLimit
): boolean {
  const pauseThreshold = getPauseThreshold(usage.included, workflowRuns);

  return usage.state !== 'paused' && pauseThreshold !== null && usage.current >= pauseThreshold;
}
