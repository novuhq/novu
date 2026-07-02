import type { ResourceLimitSource } from '@novu/shared';
import { PlanLimitUpgradeDialog } from '@/components/billing/plan-limit-upgrade-dialog';

type DomainLimitDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limit: number;
  limitSource: ResourceLimitSource;
};

/**
 * Hard block for custom email domain creation. Team/Enterprise tiers offer
 * unlimited domains, so hitting a limit there means the platform-wide cap (or
 * a per-org override) — point those users to the Novu team instead of upselling.
 */
export function DomainLimitDialog({ open, onOpenChange, limit, limitSource }: DomainLimitDialogProps) {
  if (limitSource === 'system') {
    return (
      <PlanLimitUpgradeDialog
        open={open}
        onOpenChange={onOpenChange}
        title="You've reached the maximum number of domains"
        description={
          <>
            Your organization has reached the limit of{' '}
            <span className="font-medium">
              {limit} {limit === 1 ? 'domain' : 'domains'}
            </span>
            . Please reach out to the Novu team — we&apos;re happy to help raise this limit for your organization.
          </>
        }
        primaryCta="contact-support"
        telemetrySource="domains-system-limit-dialog"
        utmCampaign="domains_system_limit"
      />
    );
  }

  return (
    <PlanLimitUpgradeDialog
      open={open}
      onOpenChange={onOpenChange}
      title="You can't add more domains on this plan"
      description={
        <>
          Your plan includes{' '}
          <span className="font-medium">
            {limit} custom email {limit === 1 ? 'domain' : 'domains'}
          </span>
          . Upgrade your plan to add more.
        </>
      }
      primaryCta="upgrade"
      telemetrySource="domains-plan-limit-dialog"
      utmCampaign="domains_plan_limit"
    />
  );
}
