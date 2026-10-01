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

export const usageLimitsPayloadSchema = z.object({
  organizationId: z.string(),
  organizationName: z.string(),
  /** ISO start of the billing period. */
  periodStart: z.string(),
  /**
   * The threshold crossed: 75, 90 or 100 percent of the way from the included events of a set limit (0 otherwise) to
   * `allowance`, or 0 for `included_exhausted`.
   */
  percentage: z.number().min(0),
  usage: z.number().min(0),
  /** The cap the percentage thresholds lead up to. */
  allowance: z.number().min(0),
  planName: z.string(),
  alertState: usageLimitsAlertStateSchema,
  /** Sent while workflow-run usage limits are enabled for the organization; without it the alert keeps its plan copy. */
  usageLimits: z
    .object({
      /** Included workflow runs of a plan that bills on-demand runs past them; null on plans that do not. */
      includedEvents: z.number().min(0).nullable(),
      /** `allowance` is a usage limit the organization set and can edit, rather than its plan's alert level. */
      isLimitSet: z.boolean(),
    })
    .optional(),
});

export type UsageLimitsPayload = z.infer<typeof usageLimitsPayloadSchema>;
