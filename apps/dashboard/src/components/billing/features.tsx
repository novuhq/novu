import {
  ApiServiceLevelEnum,
  FeatureFlags,
  FeatureNameEnum,
  getFeatureForTierAsBoolean,
  getFeatureForTierAsText
} from "@novu/shared";
import { Check } from "lucide-react";
import { cn } from "../../utils/ui";
import { useFlagsMap } from "@/hooks/use-feature-flag.tsx";

3;
enum SupportedPlansEnum {
  FREE = 'FREE',
  PRO = 'PRO',
  TEAM = 'TEAM',
  ENTERPRISE = 'ENTERPRISE',
}

const supportedPlansEnumToServiceLevelRecord: Record<SupportedPlansEnum, ApiServiceLevelEnum> = {
  FREE: ApiServiceLevelEnum.FREE,
  PRO: ApiServiceLevelEnum.PRO,
  TEAM: ApiServiceLevelEnum.TEAM,
  ENTERPRISE: ApiServiceLevelEnum.ENTERPRISE,
};
type FeatureValue = {
  value: React.ReactNode;
};

type Feature = {
  label: string;
  isTitle?: boolean;
  values: Partial<Record<SupportedPlansEnum, FeatureValue>>;
};

interface BuildValuesParams {
  featureName?: FeatureNameEnum;
  isBoolean?: boolean;
  prefix?: string | React.ReactNode;
  suffix?: string | React.ReactNode;
}

const features: (activeFlags: FeatureFlags) => Feature[] = (featureFlags: FeatureFlags) => {
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
      label: 'Framework',
      isTitle: true,
      values: buildEmptyRow(),
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
      label: 'Digests',
      values: buildTableRowRecord({ featureName: FeatureNameEnum.PLATFORM_MAX_DIGEST_WINDOW_TIME }),
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
  function buildTableRowRecord(params: BuildValuesParams): Partial<Record<SupportedPlansEnum, FeatureValue>> {
    const result: Partial<Record<SupportedPlansEnum, FeatureValue>> = {};

    for (const plan of Object.values(SupportedPlansEnum)) {
      result[plan] = {
        value: getValue(params, supportedPlansEnumToServiceLevelRecord[plan], featureFlags),
      };
    }

    return result;
  }
};

function FeatureRow({ feature, index }: { feature: Feature; index: number }) {
  return (
    <div
      className={cn('divide-border grid grid-cols-5 divide-x bg-neutral-50', {
        'bg-muted/50': index % 2 === 1,
        'border-border border-y': feature.isTitle,
      })}
    >
      <div className="p-4">
        <span
          className={cn('text-sm', {
            'text-foreground font-semibold': feature.isTitle,
            'text-muted-foreground': !feature.isTitle,
          })}
        >
          {feature.label}
        </span>
      </div>

      {Object.entries(feature.values).map(([plan, value]) => (
        <div key={plan} className="flex items-center justify-center p-4">
          <span className="text-muted-foreground text-sm">{value.value}</span>
        </div>
      ))}
    </div>
  );
}

export function Features() {
  const activeFlags = useFlagsMap();

  return (
    <div className="flex flex-col">
      {features(activeFlags).map((feature, index) => (
        <FeatureRow key={index} feature={feature} index={index} />
      ))}
    </div>
  );
}
function getBooleanValue(params: BuildValuesParams, apiServiceLevel: ApiServiceLevelEnum, featureFlags: FeatureFlags) {
  const bool = params.featureName ? getFeatureForTierAsBoolean(params.featureName, apiServiceLevel, featureFlags) : '';
  return bool ? <Check className="h-4 w-4" /> : '-';
}

function getTextValue(params: BuildValuesParams, apiServiceLevel: ApiServiceLevelEnum, featureFlags: FeatureFlags) {
  const text = params.featureName ? getFeatureForTierAsText(params.featureName, apiServiceLevel, featureFlags) : '';
  return `${params.prefix || ''}${text}${params.suffix || ''}`;
}

function getValue(params: BuildValuesParams, apiServiceLevel: ApiServiceLevelEnum, featureFlags: FeatureFlags) {
  if (params.isBoolean) {
    return getBooleanValue(params, apiServiceLevel, featureFlags);
  } else {
    return getTextValue(params, apiServiceLevel, featureFlags);
  }
}
