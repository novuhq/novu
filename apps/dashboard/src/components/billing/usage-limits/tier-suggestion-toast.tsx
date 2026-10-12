import { ApiServiceLevelEnum } from '@novu/shared';
import { InlineToast } from '@/components/primitives/inline-toast';
import { useCheckoutSession } from '@/hooks/use-checkout-session';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { ContactSalesButton } from '../contact-sales-button';
import {
  CONTACT_SALES_MONTHLY_COST_THRESHOLD,
  formatUsd,
  TEAMS_MONTHLY_COST,
  type TierSuggestion,
} from './usage-limits-form-values';

type TierSuggestionToastProps = {
  suggestion: TierSuggestion;
  monthlyCostAtLimit: number;
  billingInterval: 'month' | 'year';
};

export function TierSuggestionToast({ suggestion, monthlyCostAtLimit, billingInterval }: TierSuggestionToastProps) {
  const track = useTelemetry();
  const { navigateToCheckout, isLoading: isCheckingOut } = useCheckoutSession();

  const handleUpgradeClick = () => {
    track(TelemetryEvent.UPGRADE_TO_TEAM_TIER_CLICK, { source: 'usage_alert' });
    void navigateToCheckout({ requestedServiceLevel: ApiServiceLevelEnum.BUSINESS, billingInterval });
  };

  switch (suggestion) {
    case 'upgrade_to_teams':
      return (
        <InlineToast
          variant="tip"
          title="Teams may cost less."
          description={`At this limit you'd pay up to ${formatUsd(monthlyCostAtLimit)}/mo. Teams is ${formatUsd(TEAMS_MONTHLY_COST)}/mo with more included runs.`}
          ctaLabel="Upgrade to Teams"
          onCtaClick={handleUpgradeClick}
          isCtaLoading={isCheckingOut}
        />
      );
    case 'contact_sales':
      return (
        <InlineToast
          variant="tip"
          title={`Spending $${CONTACT_SALES_MONTHLY_COST_THRESHOLD}+/mo?`}
          description="Talk to us about volume pricing."
          cta={<ContactSalesButton utmCampaign="usage_alert" />}
        />
      );
    default: {
      const exhaustiveCheck: never = suggestion;

      return exhaustiveCheck;
    }
  }
}
