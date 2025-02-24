import { Badge } from '@/components/primitives/badge';
import { Card } from '@/components/primitives/card';
import {
  ApiServiceLevelEnum,
  FeatureFlags,
  FeatureFlagsKeysEnum,
  FeatureNameEnum,
  getFeatureForTierAsNumber,
  getFeatureForTierAsText,
  StripeBillingIntervalEnum,
} from '@novu/shared';
import { Check } from 'lucide-react';
import React from 'react';
import { ContactSalesButton } from './contact-sales-button';
import { PlanActionButton } from './plan-action-button';

interface PlansRowProps {
  selectedBillingInterval: StripeBillingIntervalEnum;
  currentPlan?: ApiServiceLevelEnum;
  trial?: {
    isActive: boolean;
  };
  featureFlags: FeatureFlags;
}
interface PlanConfig {
  name: string;
  price: string;
  subtitle: string;
  events: string;
  features: string[];
  actionType?: 'button' | 'contact';
}

const PlanFeature: React.FC<{ text: string }> = ({ text }) => (
  <li className="flex items-center gap-2 text-sm">
    <Check className="text-primary h-4 w-4" />
    <span>{text}</span>
  </li>
);

const PlanDisplay: React.FC<{
  price: string;
  subtitle: string;
  events: string;
  isEnterprise?: boolean;
}> = ({ price, subtitle, events, isEnterprise = false }) => (
  <div className="space-y-1">
    <div className="flex items-baseline gap-1">
      <span className={`${isEnterprise ? 'text-2xl font-semibold' : 'text-3xl font-bold tracking-tight'}`}>
        {price}
      </span>
      {!isEnterprise && <span className="text-muted-foreground text-sm font-medium">{subtitle}</span>}
    </div>
    {isEnterprise ? (
      <span className="text-muted-foreground text-sm">For large-scale operations</span>
    ) : (
      <span className="text-muted-foreground text-sm">{events}</span>
    )}
  </div>
);

function calcCostFeatureName(interval: StripeBillingIntervalEnum) {
  return interval === StripeBillingIntervalEnum.YEAR
    ? FeatureNameEnum.PLATFORM_ANNUAL_COST
    : FeatureNameEnum.PLATFORM_MONTHLY_COST;
}

function getEventsIncludedParsedText(apiServiceLevelEnum: ApiServiceLevelEnum) {
  const eventsIncluded = getFeatureForTierAsNumber(
    FeatureNameEnum.PLATFORM_MONTHLY_EVENTS_INCLUDED,
    apiServiceLevelEnum
  );
  const events: string = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(eventsIncluded);
  return events;
}

function buildSubtitle(interval: StripeBillingIntervalEnum, price: string) {
  if (price === '0$') return 'Free forever';
  return `billed ${interval === 'year' ? 'annually' : 'monthly'}`;
}

function buildPlanConfig(
  apiServiceLevelEnum: ApiServiceLevelEnum,
  actionType: ActionType,
  firstFeature: string,
  lastFeature: string
): (interval: StripeBillingIntervalEnum, featureFlags: FeatureFlags) => PlanConfig {
  return (interval: StripeBillingIntervalEnum, featureFlags) => {
    const maxTeamMembers = getFeatureForTierAsText(
      FeatureNameEnum.ACCOUNT_MAX_TEAM_MEMBERS,
      apiServiceLevelEnum,
      featureFlags
    );
    const price = getFeatureForTierAsText(calcCostFeatureName(interval), apiServiceLevelEnum, featureFlags);
    return {
      name: getFeatureForTierAsText(FeatureNameEnum.PLATFORM_PLAN_LABEL, apiServiceLevelEnum, featureFlags),
      price,
      subtitle: buildSubtitle(interval, price),
      events: `${getEventsIncludedParsedText(apiServiceLevelEnum)} events per month`,
      features: [firstFeature, `${maxTeamMembers} team members`, lastFeature],
      actionType: actionType,
    };
  };
}

enum ActionType {
  BUTTON = 'button',
  CONTACT = 'contact',
}
const PLAN_CONFIGURATIONS: Record<
  string,
  (interval: StripeBillingIntervalEnum, featureFlags: FeatureFlags) => PlanConfig
> = {
  [ApiServiceLevelEnum.FREE]: buildPlanConfig(
    ApiServiceLevelEnum.FREE,
    ActionType.BUTTON,
    'All core features',
    'Community support'
  ),
  [ApiServiceLevelEnum.PRO]: buildPlanConfig(
    ApiServiceLevelEnum.PRO,
    ActionType.BUTTON,
    'Everything in Free',
    'Remove Novu Branding'
  ),
  [ApiServiceLevelEnum.BUSINESS]: buildPlanConfig(
    ApiServiceLevelEnum.BUSINESS,
    ActionType.BUTTON,
    'Everything in Pro',
    'Priority support'
  ),
  [ApiServiceLevelEnum.ENTERPRISE]: buildPlanConfig(
    ApiServiceLevelEnum.ENTERPRISE,
    ActionType.CONTACT,
    'Everything in Business',
    'Custom contracts & SLA'
  ),
};

function augmentPlansConfigurationsBasedOnFeatureFlag(
  configurations: Record<string, (interval: StripeBillingIntervalEnum, featureFlags: FeatureFlags) => PlanConfig>,
  featureFlags: FeatureFlags
) {
  if (!featureFlags[FeatureFlagsKeysEnum.IS_2025_Q1_TIERING_ENABLED]) {
    delete configurations[ApiServiceLevelEnum.PRO];
    const planConfigPreFF = configurations[ApiServiceLevelEnum.BUSINESS];

    configurations[ApiServiceLevelEnum.BUSINESS] = (interval, featureFlags) => {
      const planConfig = planConfigPreFF(interval, featureFlags);
      planConfig.name = 'Business';
      planConfig.features[0] = 'Everything in Free';
      return planConfig;
    };
  }

  return configurations;
}

export function PlansRow({ selectedBillingInterval, currentPlan, trial, featureFlags }: PlansRowProps) {
  const effectiveCurrentPlan = trial?.isActive ? ApiServiceLevelEnum.FREE : currentPlan;
  const augmentedPlans = augmentPlansConfigurationsBasedOnFeatureFlag(PLAN_CONFIGURATIONS, featureFlags);
  const numberOfPlans = Object.keys(augmentedPlans).length;
  return (
    <div className={`grid grid-cols-1 gap-6 md:grid-cols-${numberOfPlans}`}>
      {Object.entries(augmentedPlans).map(([planKey, planConfigFunc]) => {
        const planConfig = planConfigFunc(selectedBillingInterval, featureFlags);
        const isCurrentPlan = effectiveCurrentPlan === planKey && !trial?.isActive;

        return (
          <Card
            key={planKey}
            className={`relative overflow-hidden border transition-colors ${
              isCurrentPlan ? 'border-primary border-2 shadow-md' : 'hover:border-primary/50'
            }`}
          >
            <div className="flex h-full flex-col p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">{planConfig.name}</h3>
                  {effectiveCurrentPlan === planKey && (
                    <Badge variant="light" color="gray" size="sm">
                      Current Plan
                    </Badge>
                  )}
                </div>

                <PlanDisplay
                  price={planConfig.price}
                  subtitle={planKey === 'enterprise' ? '' : planConfig.subtitle}
                  isEnterprise={planKey === 'enterprise'}
                  events={planConfig.events}
                />
                <ul className="space-y-2">
                  {planConfig.features.map((feature, index) => (
                    <PlanFeature key={index} text={feature} />
                  ))}
                </ul>
              </div>

              <div className="mt-auto pt-6">
                {planKey === 'enterprise' ? (
                  effectiveCurrentPlan === 'enterprise' ? (
                    <PlanActionButton
                      billingInterval={selectedBillingInterval}
                      requestedServiceLevel={effectiveCurrentPlan}
                      mode="outline"
                      className="w-full"
                    />
                  ) : (
                    <ContactSalesButton variant="outline" className="w-full" />
                  )
                ) : effectiveCurrentPlan !== 'enterprise' ? (
                  <PlanActionButton
                    billingInterval={selectedBillingInterval}
                    requestedServiceLevel={effectiveCurrentPlan || ApiServiceLevelEnum.FREE}
                    mode="filled"
                    className="w-full"
                  />
                ) : null}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
