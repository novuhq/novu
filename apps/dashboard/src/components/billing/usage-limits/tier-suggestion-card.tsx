import { ApiServiceLevelEnum } from '@novu/shared';
import type { ReactNode } from 'react';
import { RiArrowRightSLine, RiCloseLine } from 'react-icons/ri';
import { Badge } from '@/components/primitives/badge';
import { Button } from '@/components/primitives/button';
import { CompactButton } from '@/components/primitives/button-compact';
import { LinkButton } from '@/components/primitives/button-link';
import { useCheckoutSession } from '@/hooks/use-checkout-session';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { cn } from '@/utils/ui';
import { ContactSalesButton } from '../contact-sales-button';
import { formatWholeUsd, getTeamsSavings, TEAMS_MONTHLY_COST, type TierSuggestion } from './usage-limits-form-values';
import type { UsageLimitsPlan } from './usage-limits-view';

type BillingInterval = UsageLimitsPlan['billingInterval'];

type TierSuggestionLayout = 'stacked' | 'inline';

/** Telemetry source and Cal.com UTM campaign for the suggestion CTAs. */
export type TierSuggestionSource = 'usage_alert' | 'billing_page_tier_suggestion' | 'usage_page_tier_suggestion';

const SHELL_CLASS_NAME: Record<TierSuggestionLayout, { border: string; inner: string; sparkle: string }> = {
  stacked: {
    border: 'bg-[linear-gradient(166.55deg,#FF99AD_0%,#FAE0E5_32.14%,#EBEDF2_71.43%)]',
    inner: 'gap-3 py-3 pl-3.5 pr-3',
    sparkle: 'size-[11px]',
  },
  inline: {
    border: 'bg-[linear-gradient(177.36deg,#FF99AD_0%,#FAE0E5_32.14%,#EBEDF2_71.43%)]',
    inner: 'gap-3.5 py-2.5 pl-4 pr-3',
    sparkle: 'size-3',
  },
};

const CTA_CLASS_NAME = 'rounded-md after:rounded-md';

type PlanBadgeProps = {
  plan: 'PRO' | 'TEAM' | 'ENTERPRISE';
};

function PlanBadge({ plan }: PlanBadgeProps) {
  return (
    <Badge
      variant="lighter"
      color="purple"
      className={cn(
        'rounded px-[5px] text-[10px] font-medium leading-[14px] tracking-[0.2px]',
        plan === 'TEAM' && 'bg-primary-alpha-10 text-primary-base'
      )}
    >
      {plan}
    </Badge>
  );
}

function PlanArrow() {
  return (
    <span aria-hidden className="font-code text-text-disabled text-xs tracking-[-0.36px]">
      →
    </span>
  );
}

function SpendSoFar({ monthlyCost }: { monthlyCost: number }) {
  return <span className="text-label-xs text-neutral-500">{formatWholeUsd(monthlyCost)} so far</span>;
}

function TeamsPrice() {
  return <span className="text-label-xs text-primary-base">{formatWholeUsd(TEAMS_MONTHLY_COST)}/mo</span>;
}

function SuggestionSparkle({ layout }: { layout: TierSuggestionLayout }) {
  return (
    <span className={cn('relative shrink-0', SHELL_CLASS_NAME[layout].sparkle)}>
      <img
        src="/images/sparkle.svg"
        alt=""
        className={cn('absolute -left-1 -top-1 max-w-none', layout === 'inline' ? 'size-5' : 'size-[19px]')}
      />
    </span>
  );
}

function SuggestionTitle({ title }: { title: string }) {
  return <p className="text-text-strong text-[13px] font-medium leading-[18px]">{title}</p>;
}

function PlanLine({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-1.5 whitespace-nowrap">{children}</div>;
}

type SuggestionShellProps = {
  layout: TierSuggestionLayout;
  children: ReactNode;
};

function SuggestionShell({ layout, children }: SuggestionShellProps) {
  const classNames = SHELL_CLASS_NAME[layout];

  return (
    <div
      className={cn(
        'rounded-xl p-px shadow-[0px_1px_2px_0px_rgba(15,18,26,0.04),0px_4px_14px_-2px_rgba(227,41,84,0.08)]',
        classNames.border
      )}
    >
      <div
        className={cn(
          'bg-bg-white flex items-center rounded-[11px] bg-[radial-gradient(55.56%_20.83%_at_0%_0%,rgba(255,224,232,0.7),rgba(255,242,245,0))]',
          classNames.inner
        )}
      >
        {children}
      </div>
    </div>
  );
}

type UpgradeToTeamsButtonProps = {
  billingInterval: BillingInterval;
  source: TierSuggestionSource;
};

function UpgradeToTeamsButton({ billingInterval, source }: UpgradeToTeamsButtonProps) {
  const track = useTelemetry();
  const { navigateToCheckout, isLoading: isCheckingOut } = useCheckoutSession();

  const handleUpgradeClick = () => {
    track(TelemetryEvent.UPGRADE_TO_TEAM_TIER_CLICK, { source });
    void navigateToCheckout({ requestedServiceLevel: ApiServiceLevelEnum.BUSINESS, billingInterval });
  };

  return (
    <Button
      variant="primary"
      mode="gradient"
      size="2xs"
      trailingIcon={RiArrowRightSLine}
      className={CTA_CLASS_NAME}
      onClick={handleUpgradeClick}
      isLoading={isCheckingOut}
    >
      Switch to Team
    </Button>
  );
}

function BookACallButton({ source }: { source: TierSuggestionSource }) {
  return (
    <ContactSalesButton
      utmCampaign={source}
      variant="primary"
      mode="gradient"
      size="2xs"
      trailingIcon={RiArrowRightSLine}
      className={CTA_CLASS_NAME}
    >
      Book a call
    </ContactSalesButton>
  );
}

type TierSuggestionCardProps = {
  suggestion: TierSuggestion;
  billingInterval: BillingInterval;
};

/** Stacked suggestion for the usage limits drawer, priced at the on-demand limit being set. */
export function TierSuggestionCard({ suggestion, billingInterval }: TierSuggestionCardProps) {
  const { kind, monthlyCost } = suggestion;

  return (
    <SuggestionShell layout="stacked">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-[7px]">
          <SuggestionSparkle layout="stacked" />
          <SuggestionTitle
            title={kind === 'upgrade_to_teams' ? 'Team would cost less' : 'Eligible for volume pricing'}
          />
        </div>
        <TierSuggestionPlanLine
          suggestion={suggestion}
          costLabel={
            kind === 'upgrade_to_teams' ? (
              <span className="font-code text-text-soft text-xs tracking-[-0.36px] line-through">
                {formatWholeUsd(monthlyCost)}
              </span>
            ) : (
              <span className="text-label-xs text-neutral-500">up to {formatWholeUsd(monthlyCost)}</span>
            )
          }
        />
      </div>
      <TierSuggestionCta suggestion={suggestion} billingInterval={billingInterval} source="usage_alert" />
    </SuggestionShell>
  );
}

type TierSuggestionBannerProps = {
  suggestion: TierSuggestion;
  billingInterval: BillingInterval;
  source: TierSuggestionSource;
  onComparePlans: () => void;
  onDismiss: () => void;
};

/** Full-width suggestion priced on the usage so far this cycle. */
export function TierSuggestionBanner({
  suggestion,
  billingInterval,
  source,
  onComparePlans,
  onDismiss,
}: TierSuggestionBannerProps) {
  const { kind, monthlyCost } = suggestion;

  return (
    <SuggestionShell layout="inline">
      <SuggestionSparkle layout="inline" />
      <SuggestionTitle
        title={
          kind === 'upgrade_to_teams'
            ? `Team would have saved you ${formatWholeUsd(getTeamsSavings(monthlyCost))} this cycle`
            : 'Your usage qualifies for volume pricing'
        }
      />
      <div aria-hidden className="bg-stroke-soft h-3.5 w-px shrink-0" />
      <TierSuggestionPlanLine suggestion={suggestion} costLabel={<SpendSoFar monthlyCost={monthlyCost} />} />
      <div className="min-w-0 flex-1" />
      <LinkButton
        variant="modifiable"
        size="sm"
        className="text-label-xs text-text-soft hover:text-text-sub"
        onClick={onComparePlans}
      >
        Compare plans
      </LinkButton>
      <TierSuggestionCta suggestion={suggestion} billingInterval={billingInterval} source={source} />
      <CompactButton
        variant="ghost"
        size="sm"
        icon={RiCloseLine}
        className="text-text-soft"
        aria-label="Dismiss"
        onClick={onDismiss}
      />
    </SuggestionShell>
  );
}

type TierSuggestionPlanLineProps = {
  suggestion: TierSuggestion;
  /** What the current plan costs, shown after its badge. */
  costLabel: ReactNode;
};

function TierSuggestionPlanLine({ suggestion, costLabel }: TierSuggestionPlanLineProps) {
  switch (suggestion.kind) {
    case 'upgrade_to_teams':
      return (
        <PlanLine>
          <PlanBadge plan="PRO" />
          {costLabel}
          <PlanArrow />
          <PlanBadge plan="TEAM" />
          <TeamsPrice />
        </PlanLine>
      );
    case 'contact_sales':
      return (
        <PlanLine>
          <PlanBadge plan="TEAM" />
          {costLabel}
          <PlanArrow />
          <PlanBadge plan="ENTERPRISE" />
        </PlanLine>
      );
    default: {
      const exhaustiveCheck: never = suggestion.kind;

      return exhaustiveCheck;
    }
  }
}

type TierSuggestionCtaProps = {
  suggestion: TierSuggestion;
  billingInterval: BillingInterval;
  source: TierSuggestionSource;
};

function TierSuggestionCta({ suggestion, billingInterval, source }: TierSuggestionCtaProps) {
  switch (suggestion.kind) {
    case 'upgrade_to_teams':
      return <UpgradeToTeamsButton billingInterval={billingInterval} source={source} />;
    case 'contact_sales':
      return <BookACallButton source={source} />;
    default: {
      const exhaustiveCheck: never = suggestion.kind;

      return exhaustiveCheck;
    }
  }
}
