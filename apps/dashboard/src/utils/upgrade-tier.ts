import {
  ApiServiceLevelEnum,
  FeatureNameEnum,
  getFeatureForTierAsBoolean,
  getFeatureForTierAsText,
} from '@novu/shared';
import { IS_SELF_HOSTED } from '@/config';

/**
 * Paid tiers ordered from lowest to highest, matching `TIERS_ORDER_INDEX` in the
 * shared feature matrix. `UNLIMITED` is intentionally excluded — it is an
 * internal tier with no user-facing label, so it should never be surfaced as an
 * upgrade target.
 */
const ORDERED_TIERS: ApiServiceLevelEnum[] = [
  ApiServiceLevelEnum.FREE,
  ApiServiceLevelEnum.PRO,
  ApiServiceLevelEnum.BUSINESS,
  ApiServiceLevelEnum.ENTERPRISE,
];

/**
 * User-facing name for a tier (e.g. `BUSINESS` → "Team"). Wraps the shared
 * `PLATFORM_PLAN_LABEL` feature so paywall copy always matches the billing page.
 */
export function getPlanLabel(tier: ApiServiceLevelEnum): string {
  return getFeatureForTierAsText(FeatureNameEnum.PLATFORM_PLAN_LABEL, tier);
}

/**
 * Lowest tier that unlocks a boolean-gated feature, or `null` when no tier
 * provides it. Use this to tell users exactly which plan to upgrade to instead
 * of showing a generic "upgrade your plan" prompt.
 *
 * Only meaningful for boolean features (e.g. `WEBHOOKS`, `DOMAINS_BOOLEAN`);
 * non-boolean tiers are skipped rather than throwing.
 */
export function getMinimumTierForFeature(featureName: FeatureNameEnum): ApiServiceLevelEnum | null {
  for (const tier of ORDERED_TIERS) {
    try {
      if (getFeatureForTierAsBoolean(featureName, tier)) {
        return tier;
      }
    } catch {
      // Feature isn't boolean at this tier — it can't be expressed as a simple
      // "unlocked from tier X" gate, so skip it.
    }
  }

  return null;
}

/**
 * User-facing label of the lowest tier that unlocks a boolean-gated feature
 * (e.g. `AUTO_TRANSLATIONS` → "Team"), or `null` when unknown.
 */
export function getRequiredTierLabelForFeature(featureName: FeatureNameEnum): string | null {
  const tier = getMinimumTierForFeature(featureName);

  return tier ? getPlanLabel(tier) : null;
}

/**
 * Label for a full-page paywall upgrade button. Self-hosted always routes to
 * sales (naming a cloud tier would mislead), otherwise the label names the tier
 * the user must reach, e.g. "Upgrade to Team".
 */
export function getUpgradeButtonLabel(requiredTier?: ApiServiceLevelEnum | null): string {
  if (IS_SELF_HOSTED) {
    return 'Contact Sales';
  }

  if (requiredTier) {
    return `Upgrade to ${getPlanLabel(requiredTier)}`;
  }

  return 'Upgrade plan';
}
