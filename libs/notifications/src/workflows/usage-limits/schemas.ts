import { z } from 'zod';

/**
 * - `approaching_limit`: below the allowance on a plan that blocks sending at the limit.
 * - `blocked`: at the allowance on a plan that blocks sending at the limit.
 * - `alert_level_reached`: any threshold on a plan that keeps sending past the allowance.
 */
export const usageLimitsAlertStateSchema = z.enum(['approaching_limit', 'blocked', 'alert_level_reached']);

export type UsageLimitsAlertState = z.infer<typeof usageLimitsAlertStateSchema>;
