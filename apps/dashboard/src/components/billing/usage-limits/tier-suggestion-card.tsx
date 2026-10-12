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
import { formatCompactUsd, getTeamsSavings, type TierSuggestion } from './usage-limits-form-values';
import type { UsageLimitsPlan } from './usage-limits-view';

type BillingInterval = UsageLimitsPlan['billingInterval'];

type TierSuggestionLayout = 'stacked' | 'inline';

/** Telemetry source and Cal.com UTM campaign for the suggestion CTAs. */
export type TierSuggestionSource = 'usage_alert' | 'billing_page_tier_suggestion' | 'usage_page_tier_suggestion';

type PlanName = 'PRO' | 'TEAM' | 'ENTERPRISE';

const LAYOUT_CLASS_NAME: Record<
  TierSuggestionLayout,
  { border: string; inner: string; sparkle: string; sparkleImage: string }
> = {
  stacked: {
    border: 'bg-[linear-gradient(166.55deg,#FF99AD_0%,#FAE0E5_32.14%,#EBEDF2_71.43%)]',
    inner: 'gap-3 py-3 pl-3.5 pr-3',
    sparkle: 'size-[11px]',
    sparkleImage: 'size-[19px]',
  },
  inline: {
    border: 'bg-[linear-gradient(177.36deg,#FF99AD_0%,#FAE0E5_32.14%,#EBEDF2_71.43%)]',
    inner: 'gap-3.5 py-2.5 pl-4 pr-3',
    sparkle: 'size-3',
    sparkleImage: 'size-5',
  },
};

const CTA_CLASS_NAME = 'rounded-md after:rounded-md';
const MONO_PRICE_CLASS_NAME = 'font-code text-xs tracking-[-0.36px]';

type SuggestionCopy = {
  from: PlanName;
  to: PlanName;
  /** Price shown after the target plan badge; null when the target plan has no list price. */
  toPrice: string | null;
  cardTitle: string;
  bannerTitle: string;
  cardCost: ReactNode;
};

function getSuggestionCopy(suggestion: TierSuggestion): SuggestionCopy {
  switch (suggestion.kind) {
    case 'upgrade_to_teams': {
      const savings = formatCompactUsd(getTeamsSavings(suggestion.monthlyCost, suggestion.teamsCost));

      return {
        from: 'PRO',
        to: 'TEAM',
        toPrice: `${formatCompactUsd(suggestion.teamsCost)}/mo`,
        cardTitle: 'Team would cost less',
        bannerTitle: `Team would have saved you ${savings} this cycle`,
        cardCost: (
          <span className={cn(MONO_PRICE_CLASS_NAME, 'text-text-soft line-through')}>
            {formatCompactUsd(suggestion.monthlyCost)}
          </span>
        ),
      };
    }
    case 'contact_sales':
      return {
        from: suggestion.fromPlan,
        to: 'ENTERPRISE',
        toPrice: null,
        cardTitle: 'Eligible for volume pricing',
        bannerTitle: 'Your usage qualifies for volume pricing',
        cardCost: (
          <span className="text-label-xs text-neutral-500">up to {formatCompactUsd(suggestion.monthlyCost)}</span>
        ),
      };
    default: {
      const exhaustiveCheck: never = suggestion.kind;

      return exhaustiveCheck;
    }
  }
}

function PlanBadge({ plan }: { plan: PlanName }) {
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

type PlanLineProps = {
  copy: SuggestionCopy;
  /** What the current plan costs, shown after its badge. */
  cost: ReactNode;
};

function PlanLine({ copy, cost }: PlanLineProps) {
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <PlanBadge plan={copy.from} />
      {cost}
      <span aria-hidden className={cn(MONO_PRICE_CLASS_NAME, 'text-text-disabled')}>
        →
      </span>
      <PlanBadge plan={copy.to} />
      {copy.toPrice && <span className="text-label-xs text-primary-base">{copy.toPrice}</span>}
    </div>
  );
}

function SuggestionSparkle({ layout }: { layout: TierSuggestionLayout }) {
  const { sparkle, sparkleImage } = LAYOUT_CLASS_NAME[layout];

  return (
    <span className={cn('relative shrink-0', sparkle)}>
      <img src="/images/sparkle.svg" alt="" className={cn('absolute -left-1 -top-1 max-w-none', sparkleImage)} />
    </span>
  );
}

const TITLE_CLASS_NAME = 'text-text-strong text-[13px] font-medium leading-[18px]';

type SuggestionShellProps = {
  layout: TierSuggestionLayout;
  children: ReactNode;
};

function SuggestionShell({ layout, children }: SuggestionShellProps) {
  const { border, inner } = LAYOUT_CLASS_NAME[layout];

  return (
    <div
      className={cn(
        'rounded-xl p-px shadow-[0px_1px_2px_0px_rgba(15,18,26,0.04),0px_4px_14px_-2px_rgba(227,41,84,0.08)]',
        border
      )}
    >
      <div
        className={cn(
          'bg-bg-white flex items-center rounded-[11px] bg-[radial-gradient(55.56%_20.83%_at_0%_0%,rgba(255,224,232,0.7),rgba(255,242,245,0))]',
          inner
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

type TierSuggestionCtaProps = {
  kind: TierSuggestion['kind'];
  billingInterval: BillingInterval;
  source: TierSuggestionSource;
};

function TierSuggestionCta({ kind, billingInterval, source }: TierSuggestionCtaProps) {
  switch (kind) {
    case 'upgrade_to_teams':
      return <UpgradeToTeamsButton billingInterval={billingInterval} source={source} />;
    case 'contact_sales':
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
    default: {
      const exhaustiveCheck: never = kind;

      return exhaustiveCheck;
    }
  }
}

type TierSuggestionCardProps = {
  suggestion: TierSuggestion;
  billingInterval: BillingInterval;
};

/** Stacked suggestion for the usage limits drawer, priced at the on-demand limit being set. */
export function TierSuggestionCard({ suggestion, billingInterval }: TierSuggestionCardProps) {
  const copy = getSuggestionCopy(suggestion);

  return (
    <SuggestionShell layout="stacked">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-[7px]">
          <SuggestionSparkle layout="stacked" />
          <p className={TITLE_CLASS_NAME}>{copy.cardTitle}</p>
        </div>
        <PlanLine copy={copy} cost={copy.cardCost} />
      </div>
      <TierSuggestionCta kind={suggestion.kind} billingInterval={billingInterval} source="usage_alert" />
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
  const copy = getSuggestionCopy(suggestion);

  return (
    <SuggestionShell layout="inline">
      <SuggestionSparkle layout="inline" />
      <p className={TITLE_CLASS_NAME}>{copy.bannerTitle}</p>
      <div aria-hidden className="bg-stroke-soft h-3.5 w-px shrink-0" />
      <PlanLine
        copy={copy}
        cost={<span className="text-label-xs text-neutral-500">{formatCompactUsd(suggestion.monthlyCost)} so far</span>}
      />
      <div className="min-w-0 flex-1" />
      <LinkButton
        variant="modifiable"
        size="sm"
        className="text-label-xs text-text-soft hover:text-text-sub"
        onClick={onComparePlans}
      >
        Compare plans
      </LinkButton>
      <TierSuggestionCta kind={suggestion.kind} billingInterval={billingInterval} source={source} />
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
