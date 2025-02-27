import { ApiServiceLevelEnum, FeatureFlags, FeatureFlagsKeysEnum } from '../types';

// This is a large value on purpose that should surpass any realistic system limits
const UNLIMITED_VALUE = 9999;

export enum FeatureNameEnum {
  // Platform Features
  AUTO_TRANSLATIONS = 'autoTranslations',
  PLATFORM_TERMS_OF_SERVICE = 'platformTermsOfService',
  PLATFORM_PLAN_LABEL = 'platformPlanLabel',
  PAYMENT_METHOD = 'platformPaymentMethod',
  PLATFORM_MONTHLY_COST = 'platformMonthlyCost',
  PLATFORM_ANNUAL_COST = 'platformAnnualCost',
  PLATFORM_MONTHLY_EVENTS_INCLUDED = 'platformMonthlyEventsIncluded',
  PLATFORM_MAX_API_REQUESTS_TRIGGER_EVENTS = 'platformMaxApiRequestsTriggerEvents',
  PLATFORM_MAX_API_REQUESTS_CONFIGURATION = 'platformMaxApiRequestsConfiguration',
  PLATFORM_MAX_API_REQUESTS_GLOBAL = 'platformMaxApiRequestsGlobal',
  PLATFORM_COST_PER_ADDITIONAL_1K_EVENTS = 'platformCostPerAdditional1kEvents',
  PLATFORM_CHANNELS_SUPPORTED_BOOLEAN = 'platformChannelsSupportedBoolean',
  PLATFORM_SUPPORT_SLA = 'platformSupportSla',
  PLATFORM_SUPPORT_CHANNELS = 'platformSupportChannel',
  PLATFORM_SUBSCRIBERS = 'platformSubscribers',
  PLATFORM_MAX_WORKFLOWS = 'platformMaxWorkflows',
  PLATFORM_GUI_BASED_WORKFLOW_MANAGEMENT_BOOLEAN = 'platformGuiBasedWorkflowManagementBoolean',
  PLATFORM_CODE_BASED_WORKFLOW_MANAGEMENT_BOOLEAN = 'platformCodeBasedWorkflowManagementBoolean',
  PLATFORM_SUBSCRIBER_MANAGEMENT_BOOLEAN = 'platformSubscriberManagementBoolean',
  CUSTOM_ENVIRONMENTS_BOOLEAN = 'customEnvironmentBoolean',
  PLATFORM_MULTI_ORG_MULTI_TENANCY = 'platformMultiOrgMultiTenancy',
  PLATFORM_PROVIDER_INTEGRATIONS = 'platformProviderIntegrations',
  PLATFORM_ACTIVITY_FEED_RETENTION = 'platformActivityFeedRetention',
  PLATFORM_MAX_DIGEST_WINDOW_TIME = 'platformMaxDigestWindowTime',
  PLATFORM_MAX_DELAY_DURATION = 'platformMaxDelayDuration',
  PLATFORM_STEP_CONTROLS_BOOLEAN = 'platformStepControlsBoolean',
  PLATFORM_BLOCK_BASED_EMAIL_EDITOR_BOOLEAN = 'platformBlockBasedEmailEditorBoolean',
  PLATFORM_REMOVE_NOVU_BRANDING_BOOLEAN = 'platformRemoveNovuBrandingBoolean',

  // Inbox Features
  INBOX_COMPONENT_BOOLEAN = 'inboxComponentBoolean',
  INBOX_USER_PREFERENCES_COMPONENT_BOOLEAN = 'inboxUserPreferencesComponentBoolean',
  INBOX_BELL_COMPONENT_BOOLEAN = 'inboxBellComponentBoolean',
  INBOX_NOTIFICATIONS_COMPONENT_BOOLEAN = 'inboxNotificationsComponentBoolean',
  INBOX_CONTENT_COMPONENT_BOOLEAN = 'inboxContentComponentBoolean',

  // Account Administration Features
  ACCOUNT_MAX_TEAM_MEMBERS = 'accountMaxTeamMembers',
  ACCOUNT_ROLE_BASED_ACCESS_CONTROL_BOOLEAN = 'accountRoleBasedAccessControlBoolean',
  ACCOUNT_STANDARD_BUILT_IN_AUTHENTICATION_BOOLEAN = 'accountStandardBuiltInAuthenticationBoolean',
  ACCOUNT_CUSTOM_SAML_SSO_OIDC_BOOLEAN = 'accountCustomSamlSsoOidcBoolean',
  ACCOUNT_MULTI_FACTOR_AUTHENTICATION_BOOLEAN = 'accountMultiFactorAuthenticationBoolean',

  // Compliance Features
  COMPLIANCE_GDPR_BOOLEAN = 'complianceGdprBoolean',
  COMPLIANCE_SOC2_ISO27001_REPORT_BOOLEAN = 'complianceSoc2Iso27001ReportBoolean',
  COMPLIANCE_HIPAA_BAA_BOOLEAN = 'complianceHipaaBaaBoolean',
  COMPLIANCE_CUSTOM_SECURITY_REVIEWS = 'complianceCustomSecurityReviewsBoolean',
  COMPLIANCE_DATA_PROCESSING_AGREEMENTS = 'complianceDataProcessingAgreements',

  TIERS_ORDER_INDEX = 'tiersOrderIndex',
}

export type FeatureValue = string | number | null | boolean | DetailedPriceListItem;

class DetailedPriceListItem {
  label?: string;
  value: number | string | null | boolean;
  timeSuffix?: 'h' | 'd' | 'm' | 's' | 'ms';
  currency?: '$';
}

const novuServiceTiers: Record<FeatureNameEnum, Record<ApiServiceLevelEnum, FeatureValue>> = {
  [FeatureNameEnum.PLATFORM_SUPPORT_SLA]: {
    [ApiServiceLevelEnum.FREE]: '-',
    [ApiServiceLevelEnum.PRO]: '-',
    [ApiServiceLevelEnum.BUSINESS]: '48 Hours',
    [ApiServiceLevelEnum.ENTERPRISE]: '24 Hours',
    [ApiServiceLevelEnum.UNLIMITED]: '24 Hours',
  },
  [FeatureNameEnum.TIERS_ORDER_INDEX]: {
    [ApiServiceLevelEnum.FREE]: 0,
    [ApiServiceLevelEnum.PRO]: 1,
    [ApiServiceLevelEnum.BUSINESS]: 2,
    [ApiServiceLevelEnum.ENTERPRISE]: 3,
    [ApiServiceLevelEnum.UNLIMITED]: 4,
  },
  [FeatureNameEnum.PLATFORM_PLAN_LABEL]: {
    [ApiServiceLevelEnum.FREE]: 'Free',
    [ApiServiceLevelEnum.PRO]: 'Pro',
    [ApiServiceLevelEnum.BUSINESS]: 'Team',
    [ApiServiceLevelEnum.ENTERPRISE]: 'Enterprise',
    [ApiServiceLevelEnum.UNLIMITED]: '-',
  },
  [FeatureNameEnum.PLATFORM_TERMS_OF_SERVICE]: {
    [ApiServiceLevelEnum.FREE]: 'Standard',
    [ApiServiceLevelEnum.PRO]: 'Standard',
    [ApiServiceLevelEnum.BUSINESS]: 'Standard',
    [ApiServiceLevelEnum.ENTERPRISE]: 'Custom',
    [ApiServiceLevelEnum.UNLIMITED]: 'Custom',
  },
  [FeatureNameEnum.PAYMENT_METHOD]: {
    [ApiServiceLevelEnum.FREE]: '-',
    [ApiServiceLevelEnum.PRO]: 'Credit card only',
    [ApiServiceLevelEnum.BUSINESS]: 'Credit card & PO and Invoicing',
    [ApiServiceLevelEnum.ENTERPRISE]: 'Credit card & PO and Invoicing',
    [ApiServiceLevelEnum.UNLIMITED]: 'Credit card & PO and Invoicing',
  },
  [FeatureNameEnum.PLATFORM_SUPPORT_CHANNELS]: {
    [ApiServiceLevelEnum.FREE]: 'Community & Discord',
    [ApiServiceLevelEnum.PRO]: 'Community & Discord',
    [ApiServiceLevelEnum.BUSINESS]: 'Slack & Email',
    [ApiServiceLevelEnum.ENTERPRISE]: 'Slack & Email',
    [ApiServiceLevelEnum.UNLIMITED]: 'Slack & Email',
  },
  [FeatureNameEnum.PLATFORM_MONTHLY_COST]: {
    [ApiServiceLevelEnum.FREE]: {
      value: 0,
      label: '$0',
    },
    [ApiServiceLevelEnum.PRO]: {
      value: 30,
      currency: '$',
      label: '$30',
    },
    [ApiServiceLevelEnum.BUSINESS]: {
      value: 250,
      currency: '$',
      label: '$250',
    },
    [ApiServiceLevelEnum.ENTERPRISE]: {
      value: 'Custom Pricing',
      label: 'Custom Pricing',
    },
    [ApiServiceLevelEnum.UNLIMITED]: {
      value: 'Custom Pricing',
      label: 'Custom Pricing',
    },
  },
  [FeatureNameEnum.PLATFORM_ANNUAL_COST]: {
    [ApiServiceLevelEnum.FREE]: {
      value: 0,
      label: '$0',
    },
    [ApiServiceLevelEnum.PRO]: {
      value: 330,
      currency: '$',
      label: '$330',
    },
    [ApiServiceLevelEnum.BUSINESS]: {
      value: 2700,
      currency: '$',
      label: '$2,700',
    },
    [ApiServiceLevelEnum.ENTERPRISE]: {
      value: 'Custom Pricing',
      label: 'Custom Pricing',
    },
    [ApiServiceLevelEnum.UNLIMITED]: {
      value: 'Custom Pricing',
      label: 'Custom Pricing',
    },
  },

  [FeatureNameEnum.PLATFORM_MONTHLY_EVENTS_INCLUDED]: {
    [ApiServiceLevelEnum.FREE]: { value: 10000, label: '10,000' },
    [ApiServiceLevelEnum.PRO]: { value: 30000, label: '30,000' },
    [ApiServiceLevelEnum.BUSINESS]: { value: 250000, label: '250,000' },
    [ApiServiceLevelEnum.ENTERPRISE]: { value: 5000000, label: '5,000,000' },
    [ApiServiceLevelEnum.UNLIMITED]: { value: 5000000, label: '5,000,000' },
  },
  [FeatureNameEnum.PLATFORM_MAX_API_REQUESTS_TRIGGER_EVENTS]: {
    [ApiServiceLevelEnum.FREE]: 60,
    [ApiServiceLevelEnum.PRO]: 240,
    [ApiServiceLevelEnum.BUSINESS]: 600,
    [ApiServiceLevelEnum.ENTERPRISE]: 6000,
    [ApiServiceLevelEnum.UNLIMITED]: 6000,
  },
  [FeatureNameEnum.PLATFORM_MAX_API_REQUESTS_CONFIGURATION]: {
    [ApiServiceLevelEnum.FREE]: 20,
    [ApiServiceLevelEnum.PRO]: 80,
    [ApiServiceLevelEnum.BUSINESS]: 200,
    [ApiServiceLevelEnum.ENTERPRISE]: 2000,
    [ApiServiceLevelEnum.UNLIMITED]: 2000,
  },
  [FeatureNameEnum.PLATFORM_MAX_API_REQUESTS_GLOBAL]: {
    [ApiServiceLevelEnum.FREE]: 30,
    [ApiServiceLevelEnum.PRO]: 120,
    [ApiServiceLevelEnum.BUSINESS]: 300,
    [ApiServiceLevelEnum.ENTERPRISE]: 3000,
    [ApiServiceLevelEnum.UNLIMITED]: 3000,
  },
  [FeatureNameEnum.PLATFORM_COST_PER_ADDITIONAL_1K_EVENTS]: {
    [ApiServiceLevelEnum.FREE]: { label: '-', value: null },
    [ApiServiceLevelEnum.PRO]: { label: '$1.2 per 1,000 events', value: 1.2 },
    [ApiServiceLevelEnum.BUSINESS]: { label: '$1.2 per 1,000 events', value: 1.2 },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: 'Custom', value: null },
    [ApiServiceLevelEnum.UNLIMITED]: { label: 'Custom', value: null },
  },
  [FeatureNameEnum.PLATFORM_CHANNELS_SUPPORTED_BOOLEAN]: {
    [ApiServiceLevelEnum.FREE]: { label: 'Yes', value: true },
    [ApiServiceLevelEnum.PRO]: { label: 'Yes', value: true },
    [ApiServiceLevelEnum.BUSINESS]: { label: 'Yes', value: true },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: 'Yes', value: true },
    [ApiServiceLevelEnum.UNLIMITED]: { label: 'Yes', value: true },
  },
  [FeatureNameEnum.PLATFORM_STEP_CONTROLS_BOOLEAN]: {
    [ApiServiceLevelEnum.FREE]: { label: 'Yes', value: true },
    [ApiServiceLevelEnum.PRO]: { label: 'Yes', value: true },
    [ApiServiceLevelEnum.BUSINESS]: { label: 'Yes', value: true },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: 'Yes', value: true },
    [ApiServiceLevelEnum.UNLIMITED]: { label: 'Yes', value: true },
  },
  [FeatureNameEnum.PLATFORM_SUBSCRIBERS]: {
    [ApiServiceLevelEnum.FREE]: { label: 'Unlimited', value: UNLIMITED_VALUE },
    [ApiServiceLevelEnum.PRO]: { label: 'Unlimited', value: UNLIMITED_VALUE },
    [ApiServiceLevelEnum.BUSINESS]: { label: 'Unlimited', value: UNLIMITED_VALUE },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: 'Unlimited', value: UNLIMITED_VALUE },
    [ApiServiceLevelEnum.UNLIMITED]: { label: 'Unlimited', value: UNLIMITED_VALUE },
  },
  [FeatureNameEnum.PLATFORM_MAX_WORKFLOWS]: {
    [ApiServiceLevelEnum.FREE]: { value: 20 },
    [ApiServiceLevelEnum.PRO]: { value: 20 },
    [ApiServiceLevelEnum.BUSINESS]: { value: UNLIMITED_VALUE, label: 'unlimited' },
    [ApiServiceLevelEnum.ENTERPRISE]: { value: UNLIMITED_VALUE, label: 'unlimited' },
    [ApiServiceLevelEnum.UNLIMITED]: { value: UNLIMITED_VALUE, label: 'unlimited' },
  },
  [FeatureNameEnum.PLATFORM_GUI_BASED_WORKFLOW_MANAGEMENT_BOOLEAN]: {
    [ApiServiceLevelEnum.FREE]: 1,
    [ApiServiceLevelEnum.PRO]: 1,
    [ApiServiceLevelEnum.BUSINESS]: 1,
    [ApiServiceLevelEnum.ENTERPRISE]: 1,
    [ApiServiceLevelEnum.UNLIMITED]: 1,
  },
  [FeatureNameEnum.PLATFORM_CODE_BASED_WORKFLOW_MANAGEMENT_BOOLEAN]: {
    [ApiServiceLevelEnum.FREE]: 1,
    [ApiServiceLevelEnum.PRO]: 1,
    [ApiServiceLevelEnum.BUSINESS]: 1,
    [ApiServiceLevelEnum.ENTERPRISE]: 1,
    [ApiServiceLevelEnum.UNLIMITED]: 1,
  },
  [FeatureNameEnum.PLATFORM_SUBSCRIBER_MANAGEMENT_BOOLEAN]: {
    [ApiServiceLevelEnum.FREE]: 1,
    [ApiServiceLevelEnum.PRO]: 1,
    [ApiServiceLevelEnum.BUSINESS]: 1,
    [ApiServiceLevelEnum.ENTERPRISE]: 1,
    [ApiServiceLevelEnum.UNLIMITED]: 1,
  },
  [FeatureNameEnum.CUSTOM_ENVIRONMENTS_BOOLEAN]: {
    [ApiServiceLevelEnum.FREE]: false,
    [ApiServiceLevelEnum.PRO]: false,
    [ApiServiceLevelEnum.BUSINESS]: true,
    [ApiServiceLevelEnum.ENTERPRISE]: true,
    [ApiServiceLevelEnum.UNLIMITED]: true,
  },
  [FeatureNameEnum.AUTO_TRANSLATIONS]: {
    [ApiServiceLevelEnum.FREE]: false,
    [ApiServiceLevelEnum.PRO]: false,
    [ApiServiceLevelEnum.BUSINESS]: true,
    [ApiServiceLevelEnum.ENTERPRISE]: true,
    [ApiServiceLevelEnum.UNLIMITED]: true,
  },
  [FeatureNameEnum.PLATFORM_MULTI_ORG_MULTI_TENANCY]: {
    [ApiServiceLevelEnum.FREE]: { label: 'No', value: 0 },
    [ApiServiceLevelEnum.PRO]: { label: 'No', value: 0 },
    [ApiServiceLevelEnum.BUSINESS]: { label: 'Q2 2025', value: true },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: 'Q2 2025', value: true },
    [ApiServiceLevelEnum.UNLIMITED]: { label: 'Q2 2025', value: true },
  },
  [FeatureNameEnum.PLATFORM_PROVIDER_INTEGRATIONS]: {
    [ApiServiceLevelEnum.FREE]: UNLIMITED_VALUE,
    [ApiServiceLevelEnum.PRO]: UNLIMITED_VALUE,
    [ApiServiceLevelEnum.BUSINESS]: UNLIMITED_VALUE,
    [ApiServiceLevelEnum.ENTERPRISE]: UNLIMITED_VALUE,
    [ApiServiceLevelEnum.UNLIMITED]: UNLIMITED_VALUE,
  },
  [FeatureNameEnum.PLATFORM_ACTIVITY_FEED_RETENTION]: {
    [ApiServiceLevelEnum.FREE]: { label: '24 hours', value: 24, timeSuffix: 'h' },
    [ApiServiceLevelEnum.PRO]: { label: '7 days', value: 7, timeSuffix: 'd' },
    [ApiServiceLevelEnum.BUSINESS]: { label: '90 days', value: 90, timeSuffix: 'd' },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: 'Unlimited', value: UNLIMITED_VALUE },
    [ApiServiceLevelEnum.UNLIMITED]: { label: 'Unlimited', value: UNLIMITED_VALUE },
  },
  [FeatureNameEnum.PLATFORM_MAX_DIGEST_WINDOW_TIME]: {
    [ApiServiceLevelEnum.FREE]: { label: '24 Hours', value: 24, timeSuffix: 'h' },
    [ApiServiceLevelEnum.PRO]: { label: '7 days', value: 7, timeSuffix: 'd' },
    [ApiServiceLevelEnum.BUSINESS]: { label: '90 days', value: 90, timeSuffix: 'd' },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: 'Custom', value: UNLIMITED_VALUE },
    [ApiServiceLevelEnum.UNLIMITED]: { label: 'Unlimited', value: UNLIMITED_VALUE },
  },
  [FeatureNameEnum.PLATFORM_MAX_DELAY_DURATION]: {
    [ApiServiceLevelEnum.FREE]: { label: '24 Hours', value: 24, timeSuffix: 'h' },
    [ApiServiceLevelEnum.PRO]: { label: '7 days', value: 7, timeSuffix: 'd' },
    [ApiServiceLevelEnum.BUSINESS]: { label: '90 days', value: 90, timeSuffix: 'd' },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: 'Custom', value: UNLIMITED_VALUE },
    [ApiServiceLevelEnum.UNLIMITED]: { label: 'Unlimited', value: UNLIMITED_VALUE },
  },
  [FeatureNameEnum.PLATFORM_BLOCK_BASED_EMAIL_EDITOR_BOOLEAN]: {
    [ApiServiceLevelEnum.FREE]: 1,
    [ApiServiceLevelEnum.PRO]: 1,
    [ApiServiceLevelEnum.BUSINESS]: 1,
    [ApiServiceLevelEnum.ENTERPRISE]: 1,
    [ApiServiceLevelEnum.UNLIMITED]: 1,
  },
  [FeatureNameEnum.PLATFORM_REMOVE_NOVU_BRANDING_BOOLEAN]: {
    [ApiServiceLevelEnum.FREE]: 0,
    [ApiServiceLevelEnum.PRO]: 1,
    [ApiServiceLevelEnum.BUSINESS]: 1,
    [ApiServiceLevelEnum.ENTERPRISE]: 1,
    [ApiServiceLevelEnum.UNLIMITED]: 1,
  },
  // Inbox Features
  [FeatureNameEnum.INBOX_COMPONENT_BOOLEAN]: {
    [ApiServiceLevelEnum.FREE]: 1,
    [ApiServiceLevelEnum.PRO]: 1,
    [ApiServiceLevelEnum.BUSINESS]: 1,
    [ApiServiceLevelEnum.ENTERPRISE]: 1,
    [ApiServiceLevelEnum.UNLIMITED]: 1,
  },
  [FeatureNameEnum.INBOX_USER_PREFERENCES_COMPONENT_BOOLEAN]: {
    [ApiServiceLevelEnum.FREE]: 1,
    [ApiServiceLevelEnum.PRO]: 1,
    [ApiServiceLevelEnum.BUSINESS]: 1,
    [ApiServiceLevelEnum.ENTERPRISE]: 1,
    [ApiServiceLevelEnum.UNLIMITED]: 1,
  },
  [FeatureNameEnum.INBOX_BELL_COMPONENT_BOOLEAN]: {
    [ApiServiceLevelEnum.FREE]: 1,
    [ApiServiceLevelEnum.PRO]: 1,
    [ApiServiceLevelEnum.BUSINESS]: 1,
    [ApiServiceLevelEnum.ENTERPRISE]: 1,
    [ApiServiceLevelEnum.UNLIMITED]: 1,
  },
  [FeatureNameEnum.INBOX_NOTIFICATIONS_COMPONENT_BOOLEAN]: {
    [ApiServiceLevelEnum.FREE]: 1,
    [ApiServiceLevelEnum.PRO]: 1,
    [ApiServiceLevelEnum.BUSINESS]: 1,
    [ApiServiceLevelEnum.ENTERPRISE]: 1,
    [ApiServiceLevelEnum.UNLIMITED]: 1,
  },
  [FeatureNameEnum.INBOX_CONTENT_COMPONENT_BOOLEAN]: {
    [ApiServiceLevelEnum.FREE]: 1,
    [ApiServiceLevelEnum.PRO]: 1,
    [ApiServiceLevelEnum.BUSINESS]: 1,
    [ApiServiceLevelEnum.ENTERPRISE]: 1,
    [ApiServiceLevelEnum.UNLIMITED]: 1,
  },
  // Account Administration Features
  [FeatureNameEnum.ACCOUNT_MAX_TEAM_MEMBERS]: {
    [ApiServiceLevelEnum.FREE]: 3,
    [ApiServiceLevelEnum.PRO]: 3,
    [ApiServiceLevelEnum.BUSINESS]: UNLIMITED_VALUE,
    [ApiServiceLevelEnum.ENTERPRISE]: UNLIMITED_VALUE,
    [ApiServiceLevelEnum.UNLIMITED]: UNLIMITED_VALUE,
  },
  [FeatureNameEnum.ACCOUNT_ROLE_BASED_ACCESS_CONTROL_BOOLEAN]: {
    [ApiServiceLevelEnum.FREE]: 0,
    [ApiServiceLevelEnum.PRO]: 0,
    [ApiServiceLevelEnum.BUSINESS]: 1,
    [ApiServiceLevelEnum.ENTERPRISE]: 1,
    [ApiServiceLevelEnum.UNLIMITED]: 1,
  },
  [FeatureNameEnum.ACCOUNT_STANDARD_BUILT_IN_AUTHENTICATION_BOOLEAN]: {
    [ApiServiceLevelEnum.FREE]: 1,
    [ApiServiceLevelEnum.PRO]: 1,
    [ApiServiceLevelEnum.BUSINESS]: 1,
    [ApiServiceLevelEnum.ENTERPRISE]: 1,
    [ApiServiceLevelEnum.UNLIMITED]: 1,
  },
  [FeatureNameEnum.ACCOUNT_CUSTOM_SAML_SSO_OIDC_BOOLEAN]: {
    [ApiServiceLevelEnum.FREE]: 0,
    [ApiServiceLevelEnum.PRO]: 0,
    [ApiServiceLevelEnum.BUSINESS]: 0,
    [ApiServiceLevelEnum.ENTERPRISE]: 1,
    [ApiServiceLevelEnum.UNLIMITED]: 1,
  },
  [FeatureNameEnum.ACCOUNT_MULTI_FACTOR_AUTHENTICATION_BOOLEAN]: {
    [ApiServiceLevelEnum.FREE]: 1,
    [ApiServiceLevelEnum.PRO]: 1,
    [ApiServiceLevelEnum.BUSINESS]: 1,
    [ApiServiceLevelEnum.ENTERPRISE]: 1,
    [ApiServiceLevelEnum.UNLIMITED]: 1,
  },
  // Compliance Features
  [FeatureNameEnum.COMPLIANCE_GDPR_BOOLEAN]: {
    [ApiServiceLevelEnum.FREE]: 1,
    [ApiServiceLevelEnum.PRO]: 1,
    [ApiServiceLevelEnum.BUSINESS]: 1,
    [ApiServiceLevelEnum.ENTERPRISE]: 1,
    [ApiServiceLevelEnum.UNLIMITED]: 1,
  },

  [FeatureNameEnum.COMPLIANCE_SOC2_ISO27001_REPORT_BOOLEAN]: {
    [ApiServiceLevelEnum.FREE]: 0,
    [ApiServiceLevelEnum.PRO]: 0,
    [ApiServiceLevelEnum.BUSINESS]: 1,
    [ApiServiceLevelEnum.ENTERPRISE]: 1,
    [ApiServiceLevelEnum.UNLIMITED]: 1,
  },
  [FeatureNameEnum.COMPLIANCE_HIPAA_BAA_BOOLEAN]: {
    [ApiServiceLevelEnum.FREE]: 0,
    [ApiServiceLevelEnum.PRO]: 0,
    [ApiServiceLevelEnum.BUSINESS]: 0,
    [ApiServiceLevelEnum.ENTERPRISE]: 1,
    [ApiServiceLevelEnum.UNLIMITED]: 1,
  },
  [FeatureNameEnum.COMPLIANCE_CUSTOM_SECURITY_REVIEWS]: {
    [ApiServiceLevelEnum.FREE]: 'SOC 2 and ISO 27001 upon request',
    [ApiServiceLevelEnum.PRO]: 'SOC 2 and ISO 27001 upon request',
    [ApiServiceLevelEnum.BUSINESS]: 'SOC 2 and ISO 27001 upon request',
    [ApiServiceLevelEnum.ENTERPRISE]: 'Custom',
    [ApiServiceLevelEnum.UNLIMITED]: 'Custom',
  },
  [FeatureNameEnum.COMPLIANCE_DATA_PROCESSING_AGREEMENTS]: {
    [ApiServiceLevelEnum.FREE]: 'Standard',
    [ApiServiceLevelEnum.PRO]: 'Standard',
    [ApiServiceLevelEnum.BUSINESS]: 'Standard',
    [ApiServiceLevelEnum.ENTERPRISE]: 'Custom',
    [ApiServiceLevelEnum.UNLIMITED]: 'Custom',
  },
};

export function isDetailedPriceListItem(item: any): item is DetailedPriceListItem {
  return (
    item !== null &&
    typeof item === 'object' &&
    ('label' in item || 'value' in item || 'timeSuffix' in item || 'currency' in item)
  );
}

export function getFeatureForTier(featureName: FeatureNameEnum, tier: ApiServiceLevelEnum): FeatureValue {
  const feature = novuServiceTiers[featureName][tier];

  // If already matches FeatureValue, return directly
  if (
    feature === null ||
    typeof feature === 'string' ||
    typeof feature === 'number' ||
    isDetailedPriceListItem(feature)
  ) {
    return feature;
  }

  throw new Error(`Invalid feature type for ${featureName} at tier ${tier}`);
}

function getConvertToMs(conversionToMs: boolean | undefined) {
  return (value: number, timeSuffix?: 'h' | 'd' | 'm' | 's' | 'ms'): number => {
    if (!conversionToMs || !timeSuffix) return value;

    switch (timeSuffix) {
      case 'ms':
        return value;
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return value;
    }
  };
}

export function getFeatureForTierAsBoolean(
  featureName: FeatureNameEnum,
  tier: ApiServiceLevelEnum,
  featureFlags: Partial<FeatureFlags>
): boolean {
  const feature: FeatureValue = getOriginalFeatureOrAugments(featureName, tier, featureFlags);

  // Handle DetailedPriceListItem
  if (isDetailedPriceListItem(feature)) {
    if (typeof feature.value === 'boolean') return feature.value;
    if (typeof feature.value === 'number') {
      if (feature.value === 0) return false;
      if (feature.value === 1) return true;
      throw new Error(`Cannot convert number ${feature.value} to boolean for ${featureName} at tier ${tier}`);
    }
    if (typeof feature.value === 'string') {
      const lowercased = feature.value.toLowerCase();
      if (lowercased === 'true') return true;
      if (lowercased === 'false') return false;
      throw new Error(`Cannot convert string "${feature.value}" to boolean for ${featureName} at tier ${tier}`);
    }
  }

  // Direct boolean
  if (typeof feature === 'boolean') return feature;

  // Number conversion
  if (typeof feature === 'number') {
    if (feature === 0) return false;
    if (feature === 1) return true;
    throw new Error(`Cannot convert number ${feature} to boolean for ${featureName} at tier ${tier}`);
  }

  // String conversion
  if (typeof feature === 'string') {
    const lowercased = feature.toLowerCase();
    if (lowercased === 'true') return true;
    if (lowercased === 'false') return false;
    throw new Error(`Cannot convert string "${feature}" to boolean for ${featureName} at tier ${tier}`);
  }

  throw new Error(`Cannot convert feature ${featureName} at tier ${tier} to boolean`);
}

function getTextFromItem(feature: DetailedPriceListItem) {
  if (feature.label) {
    return feature.label;
  }

  if (feature.value !== null && feature.value !== undefined && feature.value === UNLIMITED_VALUE) {
    return 'Unlimited';
  }

  return `${String(feature.value)} ${feature.timeSuffix || ''}`;
}

function getOriginalFeatureOrAugments(
  featureName: FeatureNameEnum,
  tier: ApiServiceLevelEnum,
  featureFlags: Partial<FeatureFlags> = {}
): FeatureValue {
  if (!tier) {
    throw new Error(`Invalid tier [${tier}] for feature ${featureName}`);
  }
  const originalFeature = novuServiceTiers[featureName][tier];
  if (originalFeature === undefined) {
    throw new Error(
      `Invalid feature [${featureName}] for tier [${tier}]: Original: ${JSON.stringify(novuServiceTiers[featureName], null, 2)}`
    );
  }
  for (const inActiveFunctionFF of Object.keys(inActiveFeatureFlagRecordGetters)) {
    const featureFlagGetter = inActiveFeatureFlagRecordGetters[inActiveFunctionFF];

    if (featureFlagGetter && !featureFlags[inActiveFunctionFF as FeatureFlagsKeysEnum]) {
      const potentiallyAugmentsFeatureValue = featureFlagGetter(featureName, originalFeature, tier);
      if (!isEqual(potentiallyAugmentsFeatureValue, originalFeature)) {
        return potentiallyAugmentsFeatureValue;
      }
    }
  }

  return originalFeature;
}
function isEqual(a: FeatureValue, b: FeatureValue): boolean {
  // Handle null cases
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;

  // Use JSON.stringify for comparison
  return JSON.stringify(a) === JSON.stringify(b);
}
export function getFeatureForTierAsText(
  featureName: FeatureNameEnum,
  tier: ApiServiceLevelEnum,
  featureFlagsEnabled: FeatureFlags
): string {
  const feature: FeatureValue = getOriginalFeatureOrAugments(featureName, tier, featureFlagsEnabled);

  if (feature === null) return '';
  if (feature === undefined) return '';
  if (feature === UNLIMITED_VALUE) return 'Unlimited';
  if (typeof feature === 'string') {
    return feature;
  }

  if (isDetailedPriceListItem(feature)) {
    return getTextFromItem(feature);
  }

  return JSON.stringify(feature);
}

function handleDetailedPriceListItem(feature: DetailedPriceListItem, conversionToMs: boolean | undefined) {
  if (typeof feature.value === 'number') {
    return getConvertToMs(conversionToMs)(feature.value, feature.timeSuffix);
  }
  if (typeof feature.value === 'string') {
    const parsed = Number(feature.value.replace(/[^\d.-]/g, ''));
    if (!Number.isNaN(parsed)) {
      return getConvertToMs(conversionToMs)(parsed, feature.timeSuffix);
    }
  }
  if (typeof feature.value === 'boolean') {
    return feature.value ? 1 : 0;
  }
  throw new Error(`Cannot convert detailed price list item to number[${feature.value}]`);
}

export function getFeatureForTierAsNumber(
  featureName: FeatureNameEnum,
  tier: ApiServiceLevelEnum,
  featureFlags: Partial<FeatureFlags> = {},
  conversionToMs?: boolean
): number {
  const featureValue: FeatureValue = getOriginalFeatureOrAugments(featureName, tier, featureFlags);
  if (isDetailedPriceListItem(featureValue)) {
    return handleDetailedPriceListItem(featureValue, conversionToMs);
  }
  if (conversionToMs) {
    throw new Error(`Cannot convert [${featureName}] at tier [${tier}] to milliseconds without unit info`);
  }
  if (typeof featureValue === 'number') {
    return featureValue; // Default to seconds to ms if no suffix
  }
  if (typeof featureValue === 'string') {
    return stringAsNumber(featureValue, featureName, tier);
  }

  // Boolean to number
  if (typeof featureValue === 'boolean') return featureValue ? 1 : 0;

  throw new Error(`Cannot convert feature ${featureName} at tier ${tier} to number`);
}
function stringAsNumber(feature: string, featureName: FeatureNameEnum, tier: ApiServiceLevelEnum): number {
  const parsed = Number(feature.replace(/[^\d.-]/g, ''));
  if (Number.isNaN(parsed)) {
    throw new Error(`Cannot convert string [${featureName}] at tier ${tier} to number`);
  }

  return parsed;
}
type FeatureAugmentFunction = (
  featureKey: FeatureNameEnum,
  featureValue: FeatureValue,
  serviceLevel: ApiServiceLevelEnum
) => FeatureValue;

const inActiveFeatureFlagRecordGetters: Record<string, FeatureAugmentFunction> = {
  [FeatureFlagsKeysEnum.IS_2025_Q1_TIERING_ENABLED]: (featureKey, featureValue, serviceLevel) => {
    if (serviceLevel === ApiServiceLevelEnum.FREE) {
      switch (featureKey) {
        case FeatureNameEnum.PLATFORM_MONTHLY_EVENTS_INCLUDED:
          return { value: 30000, label: '30,000' };
        case FeatureNameEnum.PLATFORM_MAX_WORKFLOWS:
          return { value: UNLIMITED_VALUE, label: 'Unlimited' };
        case FeatureNameEnum.PLATFORM_ACTIVITY_FEED_RETENTION:
          return { label: '30 days', value: 7, timeSuffix: 'd' };
        case FeatureNameEnum.PLATFORM_MAX_DIGEST_WINDOW_TIME:
          return { label: '7 days', value: 7, timeSuffix: 'd' };
        case FeatureNameEnum.PLATFORM_MAX_DELAY_DURATION:
          return { label: '7 days', value: 7, timeSuffix: 'd' };

        default:
          break;
      }
    }

    return featureValue;
  },
};
