import { ApiServiceLevelEnum, FeatureFlags, FeatureFlagsKeysEnum } from '../types';

// This is a large value on purpose that should surpass any realistic system limits
export const UNLIMITED_VALUE = 9999;

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
  PLATFORM_MAX_LAYOUTS = 'platformMaxLayouts',
  PLATFORM_GUI_BASED_WORKFLOW_MANAGEMENT_BOOLEAN = 'platformGuiBasedWorkflowManagementBoolean',
  PLATFORM_CODE_BASED_WORKFLOW_MANAGEMENT_BOOLEAN = 'platformCodeBasedWorkflowManagementBoolean',
  PLATFORM_SUBSCRIBER_MANAGEMENT_BOOLEAN = 'platformSubscriberManagementBoolean',
  CUSTOM_ENVIRONMENTS_BOOLEAN = 'customEnvironmentBoolean',
  PLATFORM_MULTI_ORG_MULTI_TENANCY = 'platformMultiOrgMultiTenancy',
  PLATFORM_PROVIDER_INTEGRATIONS = 'platformProviderIntegrations',
  PLATFORM_ACTIVITY_FEED_RETENTION = 'platformActivityFeedRetention',
  PLATFORM_MAX_DIGEST_WINDOW_TIME = 'platformMaxDigestWindowTime',
  PLATFORM_MAX_DELAY_DURATION = 'platformMaxDelayDuration',
  PLATFORM_MAX_THROTTLE_WINDOW_TIME = 'platformMaxThrottleWindowTime',
  PLATFORM_MAX_SNOOZE_DURATION = 'platformMaxSnoozeDuration',
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

  // Webhooks Features
  WEBHOOKS = 'webhooks',
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
    [ApiServiceLevelEnum.FREE]: { label: 'Standard support SLA', value: false },
    [ApiServiceLevelEnum.PRO]: { label: 'Standard support SLA', value: false },
    [ApiServiceLevelEnum.BUSINESS]: { label: '48 hours support SLA', value: 48, timeSuffix: 'h' },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: '24 hours support SLA', value: 24, timeSuffix: 'h' },
    [ApiServiceLevelEnum.UNLIMITED]: { label: '24 hours support SLA', value: 24, timeSuffix: 'h' },
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
    [ApiServiceLevelEnum.FREE]: { label: 'Standard ToC', value: false },
    [ApiServiceLevelEnum.PRO]: { label: 'Standard ToC', value: false },
    [ApiServiceLevelEnum.BUSINESS]: { label: 'Standard ToC', value: false },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: 'Custom ToC', value: true },
    [ApiServiceLevelEnum.UNLIMITED]: { label: 'Custom ToC', value: true },
  },
  [FeatureNameEnum.PAYMENT_METHOD]: {
    [ApiServiceLevelEnum.FREE]: { label: 'No vendor management', value: false },
    [ApiServiceLevelEnum.PRO]: { label: 'Payment via Credit card only', value: true },
    [ApiServiceLevelEnum.BUSINESS]: { label: 'Credit card & PO and Invoicing', value: true },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: 'Credit card & PO and Invoicing', value: true },
    [ApiServiceLevelEnum.UNLIMITED]: { label: 'Credit card & PO and Invoicing', value: true },
  },
  [FeatureNameEnum.PLATFORM_SUPPORT_CHANNELS]: {
    [ApiServiceLevelEnum.FREE]: { label: 'Community support', value: false },
    [ApiServiceLevelEnum.PRO]: { label: 'Chat & Email support', value: true },
    [ApiServiceLevelEnum.BUSINESS]: { label: 'Slack & Email support', value: true },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: 'Slack & Email priority support', value: true },
    [ApiServiceLevelEnum.UNLIMITED]: { label: 'Slack & Email support', value: true },
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
    [ApiServiceLevelEnum.FREE]: { value: 10000, label: '10,000 events included' },
    [ApiServiceLevelEnum.PRO]: { value: 30000, label: '30,000 events included' },
    [ApiServiceLevelEnum.BUSINESS]: { value: 250000, label: '250,000 events included' },
    [ApiServiceLevelEnum.ENTERPRISE]: { value: 5000000, label: '5,000,000 events included' },
    [ApiServiceLevelEnum.UNLIMITED]: { value: 5000000, label: '5,000,000 events included' },
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
    [ApiServiceLevelEnum.FREE]: { label: 'No additional events', value: null },
    [ApiServiceLevelEnum.PRO]: { label: '$1.20 per 1,000 additional events', value: 1.2 },
    [ApiServiceLevelEnum.BUSINESS]: { label: '$1.20 per 1,000 additional events', value: 1.2 },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: 'Custom pricing for additional events', value: 1.2 },
    [ApiServiceLevelEnum.UNLIMITED]: { label: 'Custom pricing for additional events', value: 1.2 },
  },
  [FeatureNameEnum.PLATFORM_CHANNELS_SUPPORTED_BOOLEAN]: {
    [ApiServiceLevelEnum.FREE]: { label: 'Email, InApp, SMS, Chat, Push channels', value: true },
    [ApiServiceLevelEnum.PRO]: { label: 'Email, InApp, SMS, Chat, Push channels', value: true },
    [ApiServiceLevelEnum.BUSINESS]: { label: 'Email, InApp, SMS, Chat, Push channels', value: true },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: 'Email, InApp, SMS, Chat, Push channels', value: true },
    [ApiServiceLevelEnum.UNLIMITED]: { label: 'Email, InApp, SMS, Chat, Push channels', value: true },
  },
  [FeatureNameEnum.PLATFORM_STEP_CONTROLS_BOOLEAN]: {
    [ApiServiceLevelEnum.FREE]: { label: 'Yes', value: true },
    [ApiServiceLevelEnum.PRO]: { label: 'Yes', value: true },
    [ApiServiceLevelEnum.BUSINESS]: { label: 'Yes', value: true },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: 'Yes', value: true },
    [ApiServiceLevelEnum.UNLIMITED]: { label: 'Yes', value: true },
  },
  [FeatureNameEnum.PLATFORM_SUBSCRIBERS]: {
    [ApiServiceLevelEnum.FREE]: { label: 'Unlimited notification subscribers', value: UNLIMITED_VALUE },
    [ApiServiceLevelEnum.PRO]: { label: 'Unlimited notification subscribers', value: UNLIMITED_VALUE },
    [ApiServiceLevelEnum.BUSINESS]: { label: 'Unlimited notification subscribers', value: UNLIMITED_VALUE },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: 'Unlimited notification subscribers', value: UNLIMITED_VALUE },
    [ApiServiceLevelEnum.UNLIMITED]: { label: 'Unlimited notification subscribers', value: UNLIMITED_VALUE },
  },
  [FeatureNameEnum.PLATFORM_MAX_WORKFLOWS]: {
    [ApiServiceLevelEnum.FREE]: { label: '20 workflows', value: 20 },
    [ApiServiceLevelEnum.PRO]: { label: '20 workflows', value: 20 },
    [ApiServiceLevelEnum.BUSINESS]: { label: 'Unlimited workflows', value: UNLIMITED_VALUE },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: 'Unlimited workflows', value: UNLIMITED_VALUE },
    [ApiServiceLevelEnum.UNLIMITED]: { label: 'Unlimited workflows', value: UNLIMITED_VALUE },
  },
  [FeatureNameEnum.PLATFORM_MAX_LAYOUTS]: {
    [ApiServiceLevelEnum.FREE]: { label: '1 layout', value: 1 },
    [ApiServiceLevelEnum.PRO]: { label: 'Custom layouts', value: UNLIMITED_VALUE },
    [ApiServiceLevelEnum.BUSINESS]: { label: 'Custom layouts', value: UNLIMITED_VALUE },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: 'Custom layouts', value: UNLIMITED_VALUE },
    [ApiServiceLevelEnum.UNLIMITED]: { label: 'Custom layouts', value: UNLIMITED_VALUE },
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
    [ApiServiceLevelEnum.FREE]: { label: 'Custom environments', value: false },
    [ApiServiceLevelEnum.PRO]: { label: 'Custom environments', value: false },
    [ApiServiceLevelEnum.BUSINESS]: { label: 'Custom environments', value: true },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: 'Custom environments', value: true },
    [ApiServiceLevelEnum.UNLIMITED]: { label: 'Custom environments', value: true },
  },
  [FeatureNameEnum.WEBHOOKS]: {
    [ApiServiceLevelEnum.FREE]: { label: 'Webhooks', value: false },
    [ApiServiceLevelEnum.PRO]: { label: 'Webhooks', value: false },
    [ApiServiceLevelEnum.BUSINESS]: { label: 'Webhooks', value: true },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: 'Webhooks', value: true },
    [ApiServiceLevelEnum.UNLIMITED]: { label: 'Webhooks', value: true },
  },
  [FeatureNameEnum.AUTO_TRANSLATIONS]: {
    [ApiServiceLevelEnum.FREE]: { label: 'Translations', value: false },
    [ApiServiceLevelEnum.PRO]: { label: 'Translations', value: false },
    [ApiServiceLevelEnum.BUSINESS]: { label: 'Translations', value: true },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: 'Translations', value: true },
    [ApiServiceLevelEnum.UNLIMITED]: { label: 'Translations', value: true },
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
    [ApiServiceLevelEnum.FREE]: { label: '24 hours activity feed retention', value: 24, timeSuffix: 'h' },
    [ApiServiceLevelEnum.PRO]: { label: '7 days activity feed retention', value: 7, timeSuffix: 'd' },
    [ApiServiceLevelEnum.BUSINESS]: { label: '90 days activity feed retention', value: 90, timeSuffix: 'd' },
    [ApiServiceLevelEnum.ENTERPRISE]: {
      label: 'Custom activity feed retention',
      value: UNLIMITED_VALUE,
      timeSuffix: 'd',
    },
    [ApiServiceLevelEnum.UNLIMITED]: {
      label: 'Custom activity feed retention',
      value: UNLIMITED_VALUE,
      timeSuffix: 'd',
    },
  },
  [FeatureNameEnum.PLATFORM_MAX_DIGEST_WINDOW_TIME]: {
    [ApiServiceLevelEnum.FREE]: { label: '24 hours max digest window time', value: 24, timeSuffix: 'h' },
    [ApiServiceLevelEnum.PRO]: { label: '7 days max digest window time', value: 7, timeSuffix: 'd' },
    [ApiServiceLevelEnum.BUSINESS]: { label: '90 days max digest window time', value: 90, timeSuffix: 'd' },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: 'Custom digest window time', value: UNLIMITED_VALUE, timeSuffix: 'd' },
    [ApiServiceLevelEnum.UNLIMITED]: { label: 'Unlimited', value: UNLIMITED_VALUE, timeSuffix: 'd' },
  },
  [FeatureNameEnum.PLATFORM_MAX_DELAY_DURATION]: {
    [ApiServiceLevelEnum.FREE]: { label: '24 hours max delay duration', value: 24, timeSuffix: 'h' },
    [ApiServiceLevelEnum.PRO]: { label: '7 days max delay duration', value: 7, timeSuffix: 'd' },
    [ApiServiceLevelEnum.BUSINESS]: { label: '90 days max delay duration', value: 90, timeSuffix: 'd' },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: 'Custom delay duration', value: UNLIMITED_VALUE, timeSuffix: 'd' },
    [ApiServiceLevelEnum.UNLIMITED]: { label: 'Unlimited', value: UNLIMITED_VALUE, timeSuffix: 'd' },
  },
  [FeatureNameEnum.PLATFORM_MAX_THROTTLE_WINDOW_TIME]: {
    [ApiServiceLevelEnum.FREE]: { label: '1 hour max throttle window', value: 1, timeSuffix: 'h' },
    [ApiServiceLevelEnum.PRO]: { label: '24 hours max throttle window', value: 24, timeSuffix: 'h' },
    [ApiServiceLevelEnum.BUSINESS]: { label: '7 days max throttle window', value: 7, timeSuffix: 'd' },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: 'Custom throttle window', value: UNLIMITED_VALUE, timeSuffix: 'd' },
    [ApiServiceLevelEnum.UNLIMITED]: { label: 'Unlimited', value: UNLIMITED_VALUE, timeSuffix: 'd' },
  },
  [FeatureNameEnum.PLATFORM_MAX_SNOOZE_DURATION]: {
    [ApiServiceLevelEnum.FREE]: { label: 'Up to 24 hours max snooze duration', value: 24, timeSuffix: 'h' },
    [ApiServiceLevelEnum.PRO]: { label: 'Up to 90 days max snooze duration', value: 90, timeSuffix: 'd' },
    [ApiServiceLevelEnum.BUSINESS]: { label: 'Up to 90 days max snooze duration', value: 90, timeSuffix: 'd' },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: 'Custom snooze duration', value: 90, timeSuffix: 'd' },
    [ApiServiceLevelEnum.UNLIMITED]: { label: 'Unlimited', value: UNLIMITED_VALUE, timeSuffix: 'd' },
  },
  [FeatureNameEnum.PLATFORM_BLOCK_BASED_EMAIL_EDITOR_BOOLEAN]: {
    [ApiServiceLevelEnum.FREE]: 1,
    [ApiServiceLevelEnum.PRO]: 1,
    [ApiServiceLevelEnum.BUSINESS]: 1,
    [ApiServiceLevelEnum.ENTERPRISE]: 1,
    [ApiServiceLevelEnum.UNLIMITED]: 1,
  },
  [FeatureNameEnum.PLATFORM_REMOVE_NOVU_BRANDING_BOOLEAN]: {
    [ApiServiceLevelEnum.FREE]: { label: 'Remove Novu branding', value: false },
    [ApiServiceLevelEnum.PRO]: { label: 'Remove Novu branding', value: true },
    [ApiServiceLevelEnum.BUSINESS]: { label: 'Remove Novu branding', value: true },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: 'Remove Novu branding', value: true },
    [ApiServiceLevelEnum.UNLIMITED]: { label: 'Remove Novu branding', value: true },
  },
  // Inbox Features
  [FeatureNameEnum.INBOX_COMPONENT_BOOLEAN]: {
    [ApiServiceLevelEnum.FREE]: { label: '<Inbox/> component', value: true },
    [ApiServiceLevelEnum.PRO]: { label: '<Inbox/> component', value: true },
    [ApiServiceLevelEnum.BUSINESS]: { label: '<Inbox/> component', value: true },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: '<Inbox/> component', value: true },
    [ApiServiceLevelEnum.UNLIMITED]: { label: '<Inbox/> component', value: true },
  },
  [FeatureNameEnum.INBOX_USER_PREFERENCES_COMPONENT_BOOLEAN]: {
    [ApiServiceLevelEnum.FREE]: { label: 'User preferences component', value: true },
    [ApiServiceLevelEnum.PRO]: { label: 'User preferences component', value: true },
    [ApiServiceLevelEnum.BUSINESS]: { label: 'User preferences component', value: true },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: 'User preferences component', value: true },
    [ApiServiceLevelEnum.UNLIMITED]: { label: 'User preferences component', value: true },
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
    [ApiServiceLevelEnum.FREE]: { label: '3 team members max', value: 3 },
    [ApiServiceLevelEnum.PRO]: { label: '3 team members max', value: 3 },
    [ApiServiceLevelEnum.BUSINESS]: { label: 'Unlimited team members', value: UNLIMITED_VALUE },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: 'Unlimited team members', value: UNLIMITED_VALUE },
    [ApiServiceLevelEnum.UNLIMITED]: { label: 'Unlimited team members', value: UNLIMITED_VALUE },
  },
  [FeatureNameEnum.ACCOUNT_ROLE_BASED_ACCESS_CONTROL_BOOLEAN]: {
    [ApiServiceLevelEnum.FREE]: { label: 'Role-Based Access Control (RBAC)', value: false },
    [ApiServiceLevelEnum.PRO]: { label: 'Role-Based Access Control (RBAC)', value: false },
    [ApiServiceLevelEnum.BUSINESS]: { label: 'Role-Based Access Control (RBAC)', value: true },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: 'Role-Based Access Control (RBAC)', value: true },
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
    [ApiServiceLevelEnum.FREE]: { label: 'SAML and Enterprise SSO providers', value: false },
    [ApiServiceLevelEnum.PRO]: { label: 'SAML and Enterprise SSO providers', value: false },
    [ApiServiceLevelEnum.BUSINESS]: { label: 'SAML and Enterprise SSO providers', value: false },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: 'SAML and Enterprise SSO providers', value: true },
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
    [ApiServiceLevelEnum.FREE]: { label: 'GDPR compliance', value: true },
    [ApiServiceLevelEnum.PRO]: { label: 'GDPR compliance', value: true },
    [ApiServiceLevelEnum.BUSINESS]: { label: 'GDPR compliance', value: true },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: 'GDPR compliance', value: true },
    [ApiServiceLevelEnum.UNLIMITED]: { label: 'GDPR compliance', value: true },
  },

  [FeatureNameEnum.COMPLIANCE_SOC2_ISO27001_REPORT_BOOLEAN]: {
    [ApiServiceLevelEnum.FREE]: 0,
    [ApiServiceLevelEnum.PRO]: 0,
    [ApiServiceLevelEnum.BUSINESS]: 1,
    [ApiServiceLevelEnum.ENTERPRISE]: 1,
    [ApiServiceLevelEnum.UNLIMITED]: 1,
  },
  [FeatureNameEnum.COMPLIANCE_HIPAA_BAA_BOOLEAN]: {
    [ApiServiceLevelEnum.FREE]: { label: 'HIPAA compliance', value: false },
    [ApiServiceLevelEnum.PRO]: { label: 'HIPAA compliance', value: false },
    [ApiServiceLevelEnum.BUSINESS]: { label: 'HIPAA compliance', value: false },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: 'HIPAA compliance', value: true },
    [ApiServiceLevelEnum.UNLIMITED]: { label: 'HIPAA compliance', value: true },
  },
  [FeatureNameEnum.COMPLIANCE_CUSTOM_SECURITY_REVIEWS]: {
    [ApiServiceLevelEnum.FREE]: { label: 'Security reviews: SOC 2 and ISO 27001 upon request', value: true },
    [ApiServiceLevelEnum.PRO]: { label: 'Security reviews: SOC 2 and ISO 27001 upon request', value: true },
    [ApiServiceLevelEnum.BUSINESS]: { label: 'Security reviews: SOC 2 and ISO 27001 upon request', value: true },
    [ApiServiceLevelEnum.ENTERPRISE]: {
      label: 'Custom security reviews: SOC 2 and ISO 27001 upon request',
      value: true,
    },
    [ApiServiceLevelEnum.UNLIMITED]: {
      label: 'Custom security reviews: SOC 2 and ISO 27001 upon request',
      value: true,
    },
  },
  [FeatureNameEnum.COMPLIANCE_DATA_PROCESSING_AGREEMENTS]: {
    [ApiServiceLevelEnum.FREE]: { label: 'Standard DPA', value: false },
    [ApiServiceLevelEnum.PRO]: { label: 'Standard DPA', value: false },
    [ApiServiceLevelEnum.BUSINESS]: { label: 'Standard DPA', value: false },
    [ApiServiceLevelEnum.ENTERPRISE]: { label: 'Custom DPA', value: true },
    [ApiServiceLevelEnum.UNLIMITED]: { label: 'Custom DPA', value: true },
  },
};

export function isDetailedPriceListItem(item: FeatureValue): item is DetailedPriceListItem {
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
    typeof feature === 'boolean' ||
    isDetailedPriceListItem(feature)
  ) {
    return feature;
  }

  throw new Error(`Invalid feature type for ${featureName} at tier ${tier}`);
}

/**
 * Converts a date range string to milliseconds.
 * @param dateRange - The date range string to convert (e.g. '1d', '24h', '7d', '1w')
 * @returns The date range in milliseconds.
 */
export function getDateRangeInMs(dateRange: string): number {
  if (!dateRange) return 0;

  const value = parseInt(dateRange, 10);
  if (Number.isNaN(value)) return 0;

  const unit = dateRange.slice(-1);
  const MS_PER_SECOND = 1000;
  const MS_PER_MINUTE = 60 * MS_PER_SECOND;
  const MS_PER_HOUR = 60 * MS_PER_MINUTE;
  const MS_PER_DAY = 24 * MS_PER_HOUR;
  const MS_PER_WEEK = 7 * MS_PER_DAY;
  const MS_PER_MONTH = 30 * MS_PER_DAY;

  switch (unit) {
    case 's':
      return value * MS_PER_SECOND;
    case 'm':
      return value * MS_PER_MINUTE;
    case 'h':
      return value * MS_PER_HOUR;
    case 'd':
      return value * MS_PER_DAY;
    case 'w':
      return value * MS_PER_WEEK;
    case 'M':
      return value * MS_PER_MONTH;
    default:
      return 0;
  }
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

export function getFeatureForTierAsBoolean(featureName: FeatureNameEnum, tier: ApiServiceLevelEnum): boolean {
  const feature: FeatureValue = novuServiceTiers[featureName][tier];

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

export function getFeatureForTierAsText(featureName: FeatureNameEnum, tier: ApiServiceLevelEnum): string {
  const feature = novuServiceTiers[featureName][tier];

  if (feature === UNLIMITED_VALUE) return 'Unlimited';
  if (typeof feature === 'string') {
    return feature;
  }

  if (isDetailedPriceListItem(feature)) {
    return getTextFromItem(feature);
  }

  return JSON.stringify(feature);
}

export function getFeatureForTierAsDateRangeValue(featureName: FeatureNameEnum, tier: ApiServiceLevelEnum): string {
  const feature = novuServiceTiers[featureName][tier];

  if (isDetailedPriceListItem(feature)) {
    return `${feature.value}${feature.timeSuffix}`;
  }

  throw new Error(`Cannot convert feature ${featureName} at tier ${tier} to date range`);
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
  conversionToMs?: boolean
): number {
  const featureValue: FeatureValue = novuServiceTiers[featureName][tier];
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
