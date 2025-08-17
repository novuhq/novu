import { getCalApi } from '@calcom/embed-react';
import { useOrganization } from '@clerk/clerk-react';
import {
  ApiServiceLevelEnum,
  FeatureNameEnum,
  getFeatureForTierAsNumber,
  getFeatureForTierAsText,
  UNLIMITED_VALUE,
} from '@novu/shared';
import { Check, Minus } from 'lucide-react';
import { useEffect } from 'react';
import { RiCalendarEventLine, RiRouteFill, RiTeamLine } from 'react-icons/ri';
import { Badge } from '@/components/primitives/badge';
import { LinkButton } from '@/components/primitives/button-link';
import { Card } from '@/components/primitives/card';
import { Progress } from '@/components/primitives/progress';
import { Skeleton } from '@/components/primitives/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useFetchSubscription } from '../../hooks/use-fetch-subscription';
import { useFetchWorkflows } from '../../hooks/use-fetch-workflows';
import { getPlanFeatures, type PlanFeature } from './features-config';
import { PlanActionButton } from './plan-action-button';

interface ActivePlanBannerProps {
  selectedBillingInterval: 'month' | 'year';
}

interface UsageMetric {
  type: 'events' | 'workflows' | 'teammates';
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const USAGE_METRICS: UsageMetric[] = [
  { type: 'events', icon: RiCalendarEventLine, label: 'Events' },
  { type: 'workflows', icon: RiRouteFill, label: 'Workflows' },
  { type: 'teammates', icon: RiTeamLine, label: 'Teammates' },
];

function formatDate(date: string | number): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatLimit(limit: number): string {
  return limit === UNLIMITED_VALUE ? '∞' : limit.toLocaleString();
}

function getEventsTooltipContent(
  usageData: { included: number },
  subscription: ReturnType<typeof useFetchSubscription>['subscription']
): string {
  const currentPlan = subscription?.apiServiceLevel || ApiServiceLevelEnum.FREE;
  const isFreePlan = currentPlan === ApiServiceLevelEnum.FREE;

  const limitMessage = isFreePlan
    ? "Further events won't be allowed after the free limit is exceeded."
    : 'Pay as you grow. No hard limit.';

  return `Includes ${formatLimit(usageData.included)} events — ${limitMessage}`;
}

function formatDateRange(
  subscription: NonNullable<ReturnType<typeof useFetchSubscription>['subscription']>,
  daysLeft: number
) {
  if (subscription.trial.isActive) {
    const endDate = subscription.trial.end ? formatDate(subscription.trial.end) : 'soon';
    return `Trial ends ${endDate} (${daysLeft} days left)`;
  }

  const start = formatDate(subscription.currentPeriodStart ?? Date.now());
  const end = formatDate(subscription.currentPeriodEnd ?? Date.now());
  return `${start} - ${end}`;
}

function getPlanBadgeText(subscription: ReturnType<typeof useFetchSubscription>['subscription']): string {
  const currentPlan = subscription?.apiServiceLevel || ApiServiceLevelEnum.FREE;
  const planLabel = getFeatureForTierAsText(FeatureNameEnum.PLATFORM_PLAN_LABEL, currentPlan);
  const isTrialActive = subscription?.trial?.isActive;

  const baseText =
    currentPlan === ApiServiceLevelEnum.FREE ? `${planLabel.toUpperCase()} FOREVER` : planLabel.toUpperCase();

  return isTrialActive ? `${baseText} (TRIAL)` : baseText;
}

function getUsageData(
  type: UsageMetric['type'],
  subscription: ReturnType<typeof useFetchSubscription>['subscription'],
  workflowsData: ReturnType<typeof useFetchWorkflows>['data'],
  organization: ReturnType<typeof useOrganization>['organization']
) {
  const currentPlan = subscription?.apiServiceLevel || ApiServiceLevelEnum.FREE;

  switch (type) {
    case 'events':
      return {
        current: subscription?.events.current ?? 0,
        included:
          subscription?.events.included ??
          getFeatureForTierAsNumber(FeatureNameEnum.PLATFORM_MONTHLY_EVENTS_INCLUDED, currentPlan, false),
        label: 'included',
      };
    case 'workflows':
      return {
        current: workflowsData?.totalCount ?? 0,
        included: getFeatureForTierAsNumber(FeatureNameEnum.PLATFORM_MAX_WORKFLOWS, currentPlan, false),
        label: 'workflows',
      };
    case 'teammates':
      return {
        current: organization?.membersCount ?? 0,
        included: getFeatureForTierAsNumber(FeatureNameEnum.ACCOUNT_MAX_TEAM_MEMBERS, currentPlan, false),
        label: 'teammates',
      };
  }
}

interface CardHeaderProps {
  title: string;
  children?: React.ReactNode;
  rightContent?: React.ReactNode;
  titleInline?: boolean;
}

function CardHeader({ title, children, rightContent, titleInline = false }: CardHeaderProps) {
  const containerClasses = titleInline ? 'items-center' : 'items-start';
  const contentClasses = titleInline ? 'flex items-center gap-3' : 'flex flex-col items-start gap-1';

  return (
    <div
      className={`flex justify-between self-stretch bg-bg-weak px-3 py-2.5 rounded-t-xl border-b border-neutral-200 h-[60px] ${containerClasses}`}
    >
      <div className={contentClasses}>
        <h3 className="text-sm font-medium leading-5 tracking-tight text-foreground">{title}</h3>
        {children}
      </div>
      {rightContent}
    </div>
  );
}

interface UsageMetricRowProps {
  metric: UsageMetric;
  subscription: ReturnType<typeof useFetchSubscription>['subscription'];
  workflowsData: ReturnType<typeof useFetchWorkflows>['data'];
  organization: ReturnType<typeof useOrganization>['organization'];
}

function UsageMetricRow({ metric, subscription, workflowsData, organization }: UsageMetricRowProps) {
  const usageData = getUsageData(metric.type, subscription, workflowsData, organization);
  const Icon = metric.icon;

  if (!subscription) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-label-xs text-text-soft">
            <Icon className="h-4 w-4" />
            <span>{metric.label}</span>
          </div>
          <Skeleton className="h-4 w-48" />
        </div>
        <Progress value={0} max={100} variant="error" className="h-0.5" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-label-xs text-text-soft">
          <Icon className="h-4 w-4" />
          <span>{metric.label}</span>
        </div>
        <span className="text-label-xs">
          <span className="text-text-sub">{usageData.current.toLocaleString()}</span> /{' '}
          <span className="text-text-soft">
            {formatLimit(usageData.included)}{' '}
            {metric.type === 'events' ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="border-b border-dotted border-text-soft/40 cursor-help">{usageData.label}</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{getEventsTooltipContent(usageData, subscription)}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              usageData.label
            )}
          </span>
        </span>
      </div>
      <Progress value={usageData.current} max={usageData.included} variant="error" className="h-0.5" />
    </div>
  );
}

interface FeatureListProps {
  title: string;
  features: PlanFeature[];
  isIncluded: boolean;
}

function FeatureList({ title, features, isIncluded }: FeatureListProps) {
  const titleColor = isIncluded ? 'text-text-sub' : 'text-text-soft';
  const Icon = isIncluded ? Check : Minus;
  const iconColor = isIncluded ? 'text-text-sub' : 'text-text-soft';

  return (
    <div>
      <h4 className={`mb-2 text-label-xs ${titleColor}`}>{title}</h4>
      <ul className="space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center gap-2 text-label-xs">
            {!feature.isMore && <Icon className={`h-4 w-4 ${iconColor}`} />}
            <span className={isIncluded ? (feature.isMore ? 'text-text-soft' : 'text-text-sub') : 'text-text-soft'}>
              {feature.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ActionButtonProps {
  selectedBillingInterval: 'month' | 'year';
  subscription: ReturnType<typeof useFetchSubscription>['subscription'];
}

function ActionButton({ selectedBillingInterval, subscription }: ActionButtonProps) {
  const currentPlan = subscription?.apiServiceLevel || ApiServiceLevelEnum.FREE;
  const isFreePlan = currentPlan === ApiServiceLevelEnum.FREE;
  const isTrialActive = subscription?.trial?.isActive;
  const isPaidActive = subscription?.isActive && !isTrialActive && !isFreePlan;

  const requestedServiceLevel = isPaidActive ? currentPlan : ApiServiceLevelEnum.PRO;

  return (
    <PlanActionButton
      billingInterval={selectedBillingInterval}
      requestedServiceLevel={requestedServiceLevel}
      size="xs"
      className="shrink-0"
    />
  );
}

function UsageCard({
  subscription,
  daysLeft,
  workflowsData,
  organization,
}: {
  subscription: ReturnType<typeof useFetchSubscription>['subscription'];
  daysLeft: number;
  workflowsData: ReturnType<typeof useFetchWorkflows>['data'];
  organization: ReturnType<typeof useOrganization>['organization'];
}) {
  return (
    <Card className="flex h-full flex-col border shadow-none">
      <CardHeader title="Usage" rightContent={<span className="text-label-xs text-text-soft">Updates hourly</span>}>
        <div className="flex items-center gap-1 text-text-soft">
          <RiCalendarEventLine className="h-3.5 w-3.5" />
          {!subscription ? (
            <Skeleton className="h-4 w-32" />
          ) : (
            <span className="text-xs font-medium leading-4">{formatDateRange(subscription, daysLeft)}</span>
          )}
        </div>
      </CardHeader>

      <div className="p-6">
        <div className="space-y-8">
          {USAGE_METRICS.map((metric) => (
            <UsageMetricRow
              key={metric.type}
              metric={metric}
              subscription={subscription}
              workflowsData={workflowsData}
              organization={organization}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

function PlanCard({
  selectedBillingInterval,
  subscription,
}: {
  selectedBillingInterval: 'month' | 'year';
  subscription: ReturnType<typeof useFetchSubscription>['subscription'];
}) {
  const currentPlan = subscription?.apiServiceLevel || ApiServiceLevelEnum.FREE;
  const { included, excluded } = getPlanFeatures(currentPlan);

  return (
    <Card className="flex h-full flex-col border shadow-none">
      <CardHeader
        title="Your plan"
        titleInline={true}
        rightContent={<ActionButton selectedBillingInterval={selectedBillingInterval} subscription={subscription} />}
      >
        <Badge variant="lighter" color="purple" size="md">
          {getPlanBadgeText(subscription)}
        </Badge>
      </CardHeader>

      <div className="p-6">
        <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
          <FeatureList title="Your plan includes..." features={included} isIncluded={true} />
          {excluded.length > 0 && (
            <FeatureList title="Your plan doesn't include" features={excluded} isIncluded={false} />
          )}
        </div>
      </div>
    </Card>
  );
}

export function ActivePlanBanner({ selectedBillingInterval }: ActivePlanBannerProps) {
  const { subscription, daysLeft } = useFetchSubscription();
  const { organization } = useOrganization();
  const { data: workflowsData } = useFetchWorkflows({ limit: 1 });

  useEffect(() => {
    (async () => {
      const cal = await getCalApi({ namespace: 'novu-meeting' });
      cal('ui', { hideEventTypeDetails: false, layout: 'month_view' });
    })();
  }, []);

  return (
    <div className="mt-6 space-y-4">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <UsageCard
          subscription={subscription}
          daysLeft={daysLeft}
          workflowsData={workflowsData}
          organization={organization}
        />
        <PlanCard selectedBillingInterval={selectedBillingInterval} subscription={subscription} />
      </div>

      <div className="flex justify-end">
        <span className="text-paragraph-sm text-text-sub">
          Have questions or need a custom plan?{' '}
          <LinkButton variant="primary">
            <button
              data-cal-namespace="novu-meeting"
              data-cal-link="team/novu/novu-meeting"
              data-cal-config='{"layout":"month_view"}'
            >
              Contact us
            </button>
          </LinkButton>
        </span>
      </div>
    </div>
  );
}
