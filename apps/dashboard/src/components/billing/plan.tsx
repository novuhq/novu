import { ActionType } from '@/components/billing/utils/action.button.constants.ts';
import { useFeatureFlagMap } from '@/hooks/use-feature-flag.tsx';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import {
  ApiServiceLevelEnum,
  FeatureFlags,
  FeatureNameEnum,
  getFeatureForTierAsBoolean,
  getFeatureForTierAsNumber,
  getFeatureForTierAsText,
  StripeBillingIntervalEnum,
} from '@novu/shared';
import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTelemetry } from '../../hooks/use-telemetry';
import { TelemetryEvent } from '../../utils/telemetry';
import { cn } from '../../utils/ui';
import { showErrorToast, showSuccessToast } from '../primitives/sonner-helpers';
import { ActivePlanBanner } from './active-plan-banner';
import { BuildValuesParams, Feature, Features, PlanFeatureValue } from './features';
import { HighlightsRow, PlanHighlights } from './highlights-row';
import { PlanSwitcher } from './plan-switcher';
import { PlanConfig, PlansRow } from './plans-row';

function getTierLabel(tierForLabel: ApiServiceLevelEnum) {
  return getFeatureForTierAsText(FeatureNameEnum.PLATFORM_PLAN_LABEL, tierForLabel);
}

function getPlanCardConfig() {
  return {
    [ApiServiceLevelEnum.FREE]: buildPlanConfig(
      ApiServiceLevelEnum.FREE,
      undefined,
      'All core features',
      'Community support'
    ),
    [ApiServiceLevelEnum.PRO]: buildPlanConfig(
      ApiServiceLevelEnum.PRO,
      ActionType.BUTTON,
      'Everything in ' + getTierLabel(ApiServiceLevelEnum.FREE),
      'Remove Novu Branding'
    ),
    [ApiServiceLevelEnum.BUSINESS]: buildPlanConfig(
      ApiServiceLevelEnum.BUSINESS,
      ActionType.BUTTON,
      `Everything in ${getTierLabel(ApiServiceLevelEnum.PRO)}`,
      'Priority support'
    ),
    [ApiServiceLevelEnum.ENTERPRISE]: buildPlanConfig(
      ApiServiceLevelEnum.ENTERPRISE,
      ActionType.CONTACT,
      `Everything in ${getTierLabel(ApiServiceLevelEnum.BUSINESS)}`,
      'Custom contracts & SLA'
    ),
  };
}

export function Plan() {
  const featureFlags = useFeatureFlagMap();
  const track = useTelemetry();
  const { subscription: data } = useFetchSubscription();
  const [selectedBillingInterval, setSelectedBillingInterval] = useState<'month' | 'year'>(
    data?.billingInterval || 'month'
  );
  const { plans, highlights, features } = {
    plans: resolvePlanCardConfig(
      getPlanCardConfig(),
      selectedBillingInterval as StripeBillingIntervalEnum,
      featureFlags
    ),
    highlights: buildHighlightsArray(featureFlags),
    features: buildFeatureArray([
      ApiServiceLevelEnum.FREE,
      ApiServiceLevelEnum.PRO,
      ApiServiceLevelEnum.BUSINESS,
      ApiServiceLevelEnum.ENTERPRISE,
    ]),
  };

  useEffect(() => {
    const checkoutResult = new URLSearchParams(window.location.search).get('result');

    if (checkoutResult === 'success') {
      showSuccessToast('Payment was successful.');
      track(TelemetryEvent.BILLING_PAYMENT_SUCCESS, {
        billingInterval: selectedBillingInterval,
        plan: data?.apiServiceLevel,
      });
    }

    if (checkoutResult === 'canceled') {
      showErrorToast('Payment was canceled.');
      track(TelemetryEvent.BILLING_PAYMENT_CANCELED, {
        billingInterval: selectedBillingInterval,
        plan: data?.apiServiceLevel,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    track(TelemetryEvent.BILLING_PAGE_VIEWED, {
      currentPlan: data?.apiServiceLevel,
      billingInterval: selectedBillingInterval,
      isTrialActive: data?.trial?.isActive,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBillingIntervalChange = (interval: StripeBillingIntervalEnum) => {
    track(TelemetryEvent.BILLING_INTERVAL_CHANGED, {
      from: selectedBillingInterval,
      to: interval,
      currentPlan: data?.apiServiceLevel,
    });
    setSelectedBillingInterval(interval);
  };

  return (
    <div className={cn('flex w-full flex-col gap-6 p-6 pt-0')}>
      <ActivePlanBanner selectedBillingInterval={selectedBillingInterval} />
      <PlanSwitcher
        selectedBillingInterval={selectedBillingInterval}
        setSelectedBillingInterval={handleBillingIntervalChange}
      />
      <PlansRow
        selectedBillingInterval={selectedBillingInterval as StripeBillingIntervalEnum}
        currentPlan={data?.apiServiceLevel as ApiServiceLevelEnum}
        plans={plans}
      />
      <HighlightsRow highlightsArray={highlights} />
      <Features features={features} />
    </div>
  );
}

const serviceLevelHighlightFunctions: Record<string, PlanHighlightResolver[]> = {
  [ApiServiceLevelEnum.FREE]: [getEventsLine, getTeammatesLine, feedRetentionLine],
  [ApiServiceLevelEnum.PRO]: [getEventsLine, getTeammatesLine, feedRetentionLine],
  [ApiServiceLevelEnum.BUSINESS]: [getEventsLine, getTeammatesLine, feedRetentionLine],
  [ApiServiceLevelEnum.ENTERPRISE]: [getEventsLine, getTeammatesLine, getSamlText],
};

const buildFeatureArray: (columns: ApiServiceLevelEnum[]) => Feature[] = (columns: ApiServiceLevelEnum[]) => {
  return [
    {
      label: 'Platform',
      isTitle: true,
      values: buildEmptyRow(),
    },
    {
      label: 'Monthly events',
      values: buildTableRowRecord({ featureName: FeatureNameEnum.PLATFORM_MONTHLY_EVENTS_INCLUDED, prefix: 'Up to ' }),
    },
    {
      label: 'Additional Events',
      values: buildTableRowRecord({ featureName: FeatureNameEnum.PLATFORM_COST_PER_ADDITIONAL_1K_EVENTS }),
    },
    {
      label: 'Email, InApp, SMS, Chat, Push Channels',
      values: buildTableRowRecord({
        featureName: FeatureNameEnum.PLATFORM_CHANNELS_SUPPORTED_BOOLEAN,
        isBoolean: true,
      }),
    },
    {
      label: 'Notification subscribers',
      values: buildTableRowRecord({ featureName: FeatureNameEnum.PLATFORM_SUBSCRIBERS }),
    },
    {
      label: 'Custom Environments',
      values: buildTableRowRecord({ featureName: FeatureNameEnum.CUSTOM_ENVIRONMENTS_BOOLEAN, isBoolean: true }),
    },
    {
      label: 'Total workflows',
      values: buildTableRowRecord({ featureName: FeatureNameEnum.PLATFORM_MAX_WORKFLOWS }),
    },
    {
      label: 'Provider integrations',
      values: buildTableRowRecord({ featureName: FeatureNameEnum.PLATFORM_PROVIDER_INTEGRATIONS }),
    },
    {
      label: 'Activity Feed retention',
      values: buildTableRowRecord({ featureName: FeatureNameEnum.PLATFORM_ACTIVITY_FEED_RETENTION }),
    },
    {
      label: 'Max Digest Window',
      values: buildTableRowRecord({ featureName: FeatureNameEnum.PLATFORM_MAX_DIGEST_WINDOW_TIME }),
    },
    {
      label: 'Max Delay Duration',
      values: buildTableRowRecord({ featureName: FeatureNameEnum.PLATFORM_MAX_DELAY_DURATION }),
    },
    {
      label: 'Step controls',
      values: buildTableRowRecord({ featureName: FeatureNameEnum.PLATFORM_STEP_CONTROLS_BOOLEAN, isBoolean: true }),
    },
    {
      label: 'Inbox',
      isTitle: true,
      values: buildEmptyRow(),
    },
    {
      label: 'Inbox component',
      values: buildTableRowRecord({ featureName: FeatureNameEnum.INBOX_BELL_COMPONENT_BOOLEAN, isBoolean: true }),
    },
    {
      label: 'User preferences component',
      values: buildTableRowRecord({
        featureName: FeatureNameEnum.INBOX_USER_PREFERENCES_COMPONENT_BOOLEAN,
        isBoolean: true,
      }),
    },
    {
      label: 'Remove Novu branding',
      values: buildTableRowRecord({
        featureName: FeatureNameEnum.PLATFORM_REMOVE_NOVU_BRANDING_BOOLEAN,
        isBoolean: true,
      }),
    },
    {
      label: 'Account administration and security',
      isTitle: true,
      values: buildEmptyRow(),
    },
    {
      label: 'Team members',
      values: buildTableRowRecord({ featureName: FeatureNameEnum.ACCOUNT_MAX_TEAM_MEMBERS }),
    },
    {
      label: 'RBAC',
      values: buildTableRowRecord({
        featureName: FeatureNameEnum.ACCOUNT_ROLE_BASED_ACCESS_CONTROL_BOOLEAN,
        isBoolean: true,
      }),
    },
    {
      label: 'GDPR compliance',
      values: buildTableRowRecord({ featureName: FeatureNameEnum.COMPLIANCE_GDPR_BOOLEAN, isBoolean: true }),
    },
    {
      label: 'SAML SSO and Enterprise SSO providers',
      values: buildTableRowRecord({
        featureName: FeatureNameEnum.ACCOUNT_CUSTOM_SAML_SSO_OIDC_BOOLEAN,
        isBoolean: true,
      }),
    },
    {
      label: 'Support and account management',
      isTitle: true,
      values: buildEmptyRow(),
    },
    {
      label: 'Support SLA',
      values: buildTableRowRecord({ featureName: FeatureNameEnum.PLATFORM_SUPPORT_SLA }),
    },
    {
      label: 'Support channels',
      values: buildTableRowRecord({ featureName: FeatureNameEnum.PLATFORM_SUPPORT_CHANNELS }),
    },
    {
      label: 'Legal & Vendor management',
      isTitle: true,
      values: buildEmptyRow(),
    },
    {
      label: 'Payment method',
      values: buildTableRowRecord({ featureName: FeatureNameEnum.PAYMENT_METHOD }),
    },
    {
      label: 'Terms of service',
      values: buildTableRowRecord({ featureName: FeatureNameEnum.PLATFORM_TERMS_OF_SERVICE }),
    },
    {
      label: 'DPA',
      values: buildTableRowRecord({ featureName: FeatureNameEnum.COMPLIANCE_DATA_PROCESSING_AGREEMENTS }),
    },
    {
      label: 'Security review',
      values: buildTableRowRecord({ featureName: FeatureNameEnum.COMPLIANCE_CUSTOM_SECURITY_REVIEWS }),
    },
  ];

  function buildEmptyRow() {
    return buildTableRowRecord({});
  }

  function buildTableRowRecord(params: BuildValuesParams): Partial<Record<ApiServiceLevelEnum, PlanFeatureValue>> {
    const result: Partial<Record<ApiServiceLevelEnum, PlanFeatureValue>> = {};

    for (const serviceLevelEnum of columns) {
      result[serviceLevelEnum] = {
        value: getValue(params, serviceLevelEnum),
      };
    }

    return result;
  }
};

function buildPlanConfig(
  apiServiceLevelEnum: ApiServiceLevelEnum,
  actionType: ActionType | undefined,
  firstFeature: string,
  lastFeature: string
): (interval: StripeBillingIntervalEnum) => PlanConfig {
  return (interval: StripeBillingIntervalEnum) => {
    const maxTeamMembers = getFeatureForTierAsText(FeatureNameEnum.ACCOUNT_MAX_TEAM_MEMBERS, apiServiceLevelEnum);
    const price = getFeatureForTierAsText(calcCostFeatureName(interval), apiServiceLevelEnum);
    return {
      name: getFeatureForTierAsText(FeatureNameEnum.PLATFORM_PLAN_LABEL, apiServiceLevelEnum),
      price,
      subtitle: buildSubtitle(interval, price),
      events: `${getEventsIncludedParsedText(apiServiceLevelEnum)} events per month`,
      features: [firstFeature, `${maxTeamMembers} team members`, lastFeature],
      actionType: actionType,
    };
  };
}

type PlanHighlightResolver = (ApiServiceLevelEnum: ApiServiceLevelEnum, activeFlags: FeatureFlags) => string;

function getBooleanValue(params: BuildValuesParams, apiServiceLevel: ApiServiceLevelEnum) {
  const bool = params.featureName ? getFeatureForTierAsBoolean(params.featureName, apiServiceLevel) : '';
  return bool ? <Check className="h-4 w-4" /> : '-';
}

function getTextValue(params: BuildValuesParams, apiServiceLevel: ApiServiceLevelEnum) {
  const text = params.featureName ? getFeatureForTierAsText(params.featureName, apiServiceLevel) : '';
  return `${params.prefix || ''}${text}${params.suffix || ''}`;
}

function getValue(params: BuildValuesParams, apiServiceLevel: ApiServiceLevelEnum) {
  if (params.isBoolean) {
    return getBooleanValue(params, apiServiceLevel);
  } else {
    return getTextValue(params, apiServiceLevel);
  }
}

function calcCostFeatureName(interval: StripeBillingIntervalEnum) {
  return interval === StripeBillingIntervalEnum.YEAR
    ? FeatureNameEnum.PLATFORM_ANNUAL_COST
    : FeatureNameEnum.PLATFORM_MONTHLY_COST;
}

function getEventsIncludedParsedText(apiServiceLevelEnum: ApiServiceLevelEnum) {
  const eventsIncluded = getFeatureForTierAsNumber(
    FeatureNameEnum.PLATFORM_MONTHLY_EVENTS_INCLUDED,
    apiServiceLevelEnum,
    false
  );
  const events: string = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(eventsIncluded);
  return events;
}

function getEventsLine(serviceLevel: ApiServiceLevelEnum) {
  const eventsAmount = getFeatureForTierAsNumber(FeatureNameEnum.PLATFORM_MONTHLY_EVENTS_INCLUDED, serviceLevel, false);
  const formatted: string = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(eventsAmount);
  return `Up to ${formatted} events per month`;
}

function getTeammatesLine(serviceLevel: ApiServiceLevelEnum) {
  const maxTeamMembers = getFeatureForTierAsText(FeatureNameEnum.ACCOUNT_MAX_TEAM_MEMBERS, serviceLevel);
  return `${maxTeamMembers} teammates`;
}

function feedRetentionLine(serviceLevel: ApiServiceLevelEnum) {
  const retention = getFeatureForTierAsText(FeatureNameEnum.PLATFORM_ACTIVITY_FEED_RETENTION, serviceLevel);
  return `${retention} Activity Feed retention`;
}

function getSamlText() {
  return 'SAML SSO';
}

function buildSubtitle(interval: StripeBillingIntervalEnum, price: string) {
  if (price === '0$') return 'Free forever';
  return `billed ${interval === 'year' ? 'annually' : 'monthly'}`;
}

function buildHighlightsArray(activeFlags: FeatureFlags): Partial<PlanHighlights> {
  const highlightsArray: Partial<PlanHighlights> = {};

  for (const serviceLevelKey of Object.keys(serviceLevelHighlightFunctions)) {
    const serviceLevel = serviceLevelKey as ApiServiceLevelEnum;
    const textFunctionsArray = serviceLevelHighlightFunctions[serviceLevel];

    highlightsArray[serviceLevel] = [];

    for (const serviceLevelBasedTextFunction of textFunctionsArray) {
      const highlightDisplayElement = {
        text: serviceLevelBasedTextFunction(serviceLevel, activeFlags),
      };
      highlightsArray[serviceLevel].push(highlightDisplayElement);
    }
  }

  return highlightsArray;
}

function resolvePlanCardConfig(
  originalRecord: Record<string, (interval: StripeBillingIntervalEnum, featureFlags: FeatureFlags) => PlanConfig>,
  interval: StripeBillingIntervalEnum,
  featureFlags: FeatureFlags
): Record<string, PlanConfig> {
  return Object.fromEntries(
    Object.entries(originalRecord).map(([key, configFn]) => [key, configFn(interval, featureFlags)])
  );
}
