import { ApiServiceLevelEnum, FeatureNameEnum, getFeatureForTierAsText } from '@novu/shared';

export interface PlanFeature {
  text: string;
  included: boolean;
  isMore?: boolean; // For "& more..." items
}

export interface FeatureSectionConfig {
  title: string;
  features: FeatureNameEnum[];
}

// Feature can be either an enum (uses constants) or a direct string
type FeatureConfig = FeatureNameEnum | string;

export const FEATURE_SECTIONS: FeatureSectionConfig[] = [
  {
    title: 'Workflow Runs',
    features: [
      FeatureNameEnum.PLATFORM_MONTHLY_EVENTS_INCLUDED,
      FeatureNameEnum.PLATFORM_COST_PER_ADDITIONAL_1K_EVENTS,
      FeatureNameEnum.PLATFORM_CHANNELS_SUPPORTED_BOOLEAN,
    ],
  },
  {
    title: 'Platform',
    features: [
      FeatureNameEnum.PLATFORM_SUBSCRIBERS,
      FeatureNameEnum.PLATFORM_MAX_WORKFLOWS,
      FeatureNameEnum.PLATFORM_MAX_LAYOUTS,
      FeatureNameEnum.CUSTOM_ENVIRONMENTS_BOOLEAN,
      FeatureNameEnum.AUTO_TRANSLATIONS,
      FeatureNameEnum.WEBHOOKS,
    ],
  },
  {
    title: 'Retention',
    features: [
      FeatureNameEnum.PLATFORM_ACTIVITY_FEED_RETENTION,
      FeatureNameEnum.PLATFORM_MAX_DELAY_DURATION,
      FeatureNameEnum.PLATFORM_MAX_DIGEST_WINDOW_TIME,
    ],
  },
  {
    title: 'Inbox',
    features: [
      FeatureNameEnum.INBOX_COMPONENT_BOOLEAN,
      FeatureNameEnum.INBOX_USER_PREFERENCES_COMPONENT_BOOLEAN,
      FeatureNameEnum.PLATFORM_REMOVE_NOVU_BRANDING_BOOLEAN,
      FeatureNameEnum.PLATFORM_MAX_SNOOZE_DURATION,
    ],
  },
  {
    title: 'Account administration and security',
    features: [
      FeatureNameEnum.ACCOUNT_MAX_TEAM_MEMBERS,
      FeatureNameEnum.ACCOUNT_ROLE_BASED_ACCESS_CONTROL_BOOLEAN,
      FeatureNameEnum.COMPLIANCE_GDPR_BOOLEAN,
      FeatureNameEnum.COMPLIANCE_HIPAA_BAA_BOOLEAN,
      FeatureNameEnum.ACCOUNT_CUSTOM_SAML_SSO_OIDC_BOOLEAN,
    ],
  },
  {
    title: 'Support and account management',
    features: [FeatureNameEnum.PLATFORM_SUPPORT_SLA, FeatureNameEnum.PLATFORM_SUPPORT_CHANNELS],
  },
  {
    title: 'Legal & Vendor management',
    features: [
      FeatureNameEnum.PAYMENT_METHOD,
      FeatureNameEnum.COMPLIANCE_CUSTOM_SECURITY_REVIEWS,
      FeatureNameEnum.PLATFORM_TERMS_OF_SERVICE,
      FeatureNameEnum.COMPLIANCE_DATA_PROCESSING_AGREEMENTS,
    ],
  },
];

const PLAN_FEATURES_CONFIG: Record<ApiServiceLevelEnum, { included: FeatureConfig[]; excluded: FeatureConfig[] }> = {
  [ApiServiceLevelEnum.FREE]: {
    included: [
      FeatureNameEnum.PLATFORM_MONTHLY_EVENTS_INCLUDED,
      FeatureNameEnum.PLATFORM_MAX_WORKFLOWS,
      FeatureNameEnum.PLATFORM_SUBSCRIBERS,
      FeatureNameEnum.PLATFORM_ACTIVITY_FEED_RETENTION,
    ],
    excluded: [
      '30,000 workflow runs & more',
      'Unlimited workflows',
      FeatureNameEnum.CUSTOM_ENVIRONMENTS_BOOLEAN,
      'Dedicated support',
      FeatureNameEnum.PLATFORM_REMOVE_NOVU_BRANDING_BOOLEAN,
    ],
  },
  [ApiServiceLevelEnum.PRO]: {
    included: [
      FeatureNameEnum.PLATFORM_MONTHLY_EVENTS_INCLUDED,
      FeatureNameEnum.PLATFORM_MAX_WORKFLOWS,
      FeatureNameEnum.PLATFORM_REMOVE_NOVU_BRANDING_BOOLEAN,
      FeatureNameEnum.PLATFORM_ACTIVITY_FEED_RETENTION,
    ],
    excluded: [
      '250,000 workflow runs & more',
      'Unlimited workflows',
      FeatureNameEnum.CUSTOM_ENVIRONMENTS_BOOLEAN,
      FeatureNameEnum.WEBHOOKS,
      FeatureNameEnum.AUTO_TRANSLATIONS,
    ],
  },
  [ApiServiceLevelEnum.BUSINESS]: {
    included: [
      FeatureNameEnum.PLATFORM_MONTHLY_EVENTS_INCLUDED,
      FeatureNameEnum.PLATFORM_MAX_WORKFLOWS,
      FeatureNameEnum.ACCOUNT_MAX_TEAM_MEMBERS,
      FeatureNameEnum.PLATFORM_ACTIVITY_FEED_RETENTION,
    ],
    excluded: [
      'Custom workflow run amount',
      FeatureNameEnum.ACCOUNT_CUSTOM_SAML_SSO_OIDC_BOOLEAN,
      '24 hours support SLA',
      'Custom delay & snooze durations',
      'Custom retention periods',
    ],
  },
  [ApiServiceLevelEnum.ENTERPRISE]: {
    included: [
      'Volume discounts',
      FeatureNameEnum.PLATFORM_MAX_WORKFLOWS,
      FeatureNameEnum.ACCOUNT_MAX_TEAM_MEMBERS,
      FeatureNameEnum.PLATFORM_ACTIVITY_FEED_RETENTION,
    ],
    excluded: ['Being told "you need to upgrade"'],
  },
  [ApiServiceLevelEnum.UNLIMITED]: {
    included: [
      'Custom workflow runs',
      FeatureNameEnum.PLATFORM_MAX_WORKFLOWS,
      FeatureNameEnum.ACCOUNT_MAX_TEAM_MEMBERS,
      FeatureNameEnum.PLATFORM_ACTIVITY_FEED_RETENTION,
    ],
    excluded: [],
  },
};

function getFeatureDisplayText(feature: FeatureConfig, plan: ApiServiceLevelEnum): string {
  if (Object.values(FeatureNameEnum).includes(feature as FeatureNameEnum)) {
    return getFeatureForTierAsText(feature as FeatureNameEnum, plan);
  }

  // It's a direct string, use as-is
  return feature as string;
}

// Get features for a specific plan (for active plan banner)
export function getPlanFeatures(plan: ApiServiceLevelEnum): { included: PlanFeature[]; excluded: PlanFeature[] } {
  const config = PLAN_FEATURES_CONFIG[plan];

  const included: PlanFeature[] = config.included.map((feature: FeatureConfig) => ({
    text: getFeatureDisplayText(feature, plan),
    included: true,
  }));

  // Add "& more..." as the last item
  included.push({
    text: '& more...',
    included: true,
    isMore: true,
  });

  const excluded: PlanFeature[] = config.excluded.map((feature: FeatureConfig) => ({
    text: getFeatureDisplayText(feature, plan),
    included: false,
  }));

  return { included, excluded };
}

// Get just the included features for plan highlights (for plan cards)
export function getPlanHighlightFeatures(plan: ApiServiceLevelEnum): string[] {
  const config = PLAN_FEATURES_CONFIG[plan];

  return config.included.map((feature: FeatureConfig) => getFeatureDisplayText(feature, plan));
}
