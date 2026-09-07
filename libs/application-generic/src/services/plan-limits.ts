import { ConflictException, HttpException, HttpStatus } from '@nestjs/common';
import {
  ApiServiceLevelEnum,
  FeatureFlagsKeysEnum,
  FeatureNameEnum,
  getFeatureForTierAsNumber,
  ResourceLimitSource,
  UNLIMITED_VALUE,
} from '@novu/shared';
import { FeatureFlagsService } from './feature-flags';

export interface ResolvedTierLimit {
  /** The effective limit for the organization. */
  limit: number;
  /**
   * The raw system limit (LaunchDarkly value, or the system default). Needed by
   * callers that derive secondary caps (e.g. creation grace) bounded by it.
   */
  systemLimit: number;
  limitSource: ResourceLimitSource;
}

/**
 * Canonical resolution kernel for plan-limited resources, following the
 * established platform pattern (see `ResourceValidatorService`):
 *
 *   1. Fetch the system limit: a LaunchDarkly flag defaulting to the
 *      platform-wide `SYSTEM_LIMITS` value.
 *   2. A LaunchDarkly value differing from the system default is a deliberate
 *      per-org ceiling — it wins outright and only the Novu team can change it
 *      (`limitSource: 'system'`).
 *   3. Unlimited tiers (Enterprise/Unlimited) are bounded only by the system
 *      cap (`limitSource: 'system'`).
 *   4. Otherwise the effective limit is `min(systemLimit, tierLimit)` and
 *      upgrading lifts it (`limitSource: 'plan'`).
 *
 * Self-hosted short-circuits are intentionally left to callers — they differ
 * per resource and must never reach the feature-flag service.
 */
export async function resolveTierLimit(params: {
  featureFlagsService: FeatureFlagsService;
  flagKey: FeatureFlagsKeysEnum;
  systemDefault: number;
  featureName: FeatureNameEnum;
  organizationId: string;
  apiServiceLevel: ApiServiceLevelEnum;
}): Promise<ResolvedTierLimit> {
  const { featureFlagsService, flagKey, systemDefault, featureName, organizationId, apiServiceLevel } = params;

  const systemLimit = await featureFlagsService.getFlag({
    key: flagKey,
    defaultValue: systemDefault,
    organization: { _id: organizationId, apiServiceLevel },
  });

  const isSpecialLimit = systemLimit !== systemDefault;
  if (isSpecialLimit) {
    return { limit: systemLimit, systemLimit, limitSource: 'system' };
  }

  const tierLimit = getFeatureForTierAsNumber(featureName, apiServiceLevel);

  if (tierLimit >= UNLIMITED_VALUE) {
    return { limit: systemLimit, systemLimit, limitSource: 'system' };
  }

  return { limit: Math.min(systemLimit, tierLimit), systemLimit, limitSource: 'plan' };
}

/**
 * Single home for the plan-limit error contract shared by every limit-bearing
 * resource (agents, custom email domains, …) and reverse-engineered by the
 * dashboard (`status` + `limit` payload field):
 *
 *   - `plan` limits → 402 Payment Required — upgrading lifts the limit;
 *   - `system` limits → 409 Conflict — only the Novu team can raise them.
 */
export function throwPlanLimitExceeded(params: {
  /** Plural, human-readable resource label used in the error copy (e.g. `agents`). */
  resource: string;
  limitSource: ResourceLimitSource;
  limit: number;
  currentCount: number;
  /** Overrides the default 402 copy when the resource needs bespoke phrasing. */
  planMessage?: string;
}): never {
  const { resource, limitSource, limit, currentCount, planMessage } = params;

  if (limitSource === 'system') {
    throw new ConflictException({
      message:
        `Your organization has reached the maximum number of ${resource} (${limit}). ` +
        'Please reach out to the Novu team to increase this limit.',
      currentCount,
      limit,
    });
  }

  throw new HttpException(
    {
      error: 'Payment Required',
      message:
        planMessage ??
        `You have reached the maximum number of ${resource} included in your plan (${limit}). ` +
          'Upgrade your plan to add more.',
      currentCount,
      limit,
    },
    HttpStatus.PAYMENT_REQUIRED
  );
}
