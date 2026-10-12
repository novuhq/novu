import { ApiServiceLevelEnum } from '@novu/shared';
import { InlineToast } from '@/components/primitives/inline-toast';
import { useCheckoutSession } from '@/hooks/use-checkout-session';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { ContactSalesButton } from '../contact-sales-button';
import {
  CONTACT_SALES_MONTHLY_COST_THRESHOLD,
  formatWholeUsd,
  TEAMS_MONTHLY_COST,
  type TierSuggestion,
} from './usage-limits-form-values';

type BillingInterval = 'month' | 'year';

type UpgradeToTeamsToastProps = {
  monthlyCostAtLimit: number;
  billingInterval: BillingInterval;
};

function UpgradeToTeamsToast({ monthlyCostAtLimit, billingInterval }: UpgradeToTeamsToastProps) {
  const track = useTelemetry();
  const { navigateToCheckout, isLoading: isCheckingOut } = useCheckoutSession();

  const handleUpgradeClick = () => {
    track(TelemetryEvent.UPGRADE_TO_TEAM_TIER_CLICK, { source: 'usage_alert' });
    void navigateToCheckout({ requestedServiceLevel: ApiServiceLevelEnum.BUSINESS, billingInterval });
  };

  return (
    <InlineToast
      variant="tip"
      title="Teams may cost less."
      description={`At this limit you'd pay up to ${formatWholeUsd(monthlyCostAtLimit)}/mo. Teams is ${formatWholeUsd(TEAMS_MONTHLY_COST)}/mo with more included runs.`}
      ctaLabel="Upgrade to Teams"
      onCtaClick={handleUpgradeClick}
      isCtaLoading={isCheckingOut}
    />
  );
}

function ContactSalesToast() {
  return (
    <InlineToast
      variant="tip"
      title={`Spending ${formatWholeUsd(CONTACT_SALES_MONTHLY_COST_THRESHOLD)}+/mo?`}
      description="Talk to us about volume pricing."
      cta={<ContactSalesButton utmCampaign="usage_alert" />}
    />
  );
}

type TierSuggestionToastProps = {
  suggestion: TierSuggestion;
  billingInterval: BillingInterval;
};

export function TierSuggestionToast({ suggestion, billingInterval }: TierSuggestionToastProps) {
  switch (suggestion.kind) {
    case 'upgrade_to_teams':
      return (
        <UpgradeToTeamsToast monthlyCostAtLimit={suggestion.monthlyCostAtLimit} billingInterval={billingInterval} />
      );
    case 'contact_sales':
      return <ContactSalesToast />;
    default: {
      const exhaustiveCheck: never = suggestion;

      return exhaustiveCheck;
    }
  }
}
