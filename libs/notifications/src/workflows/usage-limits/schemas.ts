import { z } from 'zod';

/**
 * - `included_exhausted`: at the included events on a plan that bills on-demand usage past them.
 * - `approaching_limit`: below the allowance on a plan that blocks sending at the limit.
 * - `blocked`: at the allowance on a plan that blocks sending at the limit.
 * - `alert_level_reached`: any threshold on a plan that keeps sending past the allowance.
 */
export const usageLimitsAlertStateSchema = z.enum([
  'approaching_limit',
  'blocked',
  'alert_level_reached',
  'included_exhausted',
]);

export type UsageLimitsAlertState = z.infer<typeof usageLimitsAlertStateSchema>;

/**
 * - `upgrade`: the plan has no on-demand usage, so the way forward is a paid plan.
 * - `edit_limits`: the plan's on-demand limit and pause setting are configurable in the dashboard.
 */
export const usageLimitsCtaSchema = z.enum(['upgrade', 'edit_limits']);

export type UsageLimitsCta = z.infer<typeof usageLimitsCtaSchema>;
