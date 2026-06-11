import { Cross2Icon } from '@radix-ui/react-icons';
import type { ReactNode } from 'react';
import { RiCustomerService2Line, RiInformationLine, RiLockStarLine, RiSparkling2Line } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import type { AgentLimitSource, AgentPlanUsage, PlanUsage } from '@/api/agents';
import { Button } from '@/components/primitives/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/primitives/dialog';
import { IS_SELF_HOSTED, SELF_HOSTED_UPGRADE_REDIRECT_URL } from '@/config';
import { usePlainChat } from '@/hooks/use-plain-chat';
import { useTelemetry } from '@/hooks/use-telemetry';
import { ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';
import { openInNewTab } from '@/utils/url';

const SUPPORT_EMAIL = 'support@novu.co';

type PlanLimitUpgradeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  /** Rendered as a secondary "continue past the warning" button when provided. */
  continueLabel?: string;
  onContinueAnyway?: () => void;
  /**
   * `upgrade` renders the plan-upgrade CTA; `contact-support` opens live chat
   * (or support email) for limits that upgrading cannot lift.
   */
  primaryCta: 'upgrade' | 'contact-support';
  telemetrySource: string;
  utmCampaign: string;
};

function PlanLimitUpgradeDialog({
  open,
  onOpenChange,
  title,
  description,
  continueLabel,
  onContinueAnyway,
  primaryCta,
  telemetrySource,
  utmCampaign,
}: PlanLimitUpgradeDialogProps) {
  const navigate = useNavigate();
  const track = useTelemetry();
  const { isLiveChatVisible, showPlainLiveChat } = usePlainChat();

  const handleUpgradeClick = () => {
    track(TelemetryEvent.UPGRADE_TO_TEAM_TIER_CLICK, { source: telemetrySource });

    if (IS_SELF_HOSTED) {
      openInNewTab(`${SELF_HOSTED_UPGRADE_REDIRECT_URL}?utm_campaign=${utmCampaign}`);

      return;
    }

    onOpenChange(false);
    void navigate(`${ROUTES.SETTINGS_BILLING}?utm_source=${utmCampaign}`);
  };

  const handleContactSupportClick = () => {
    onOpenChange(false);

    if (isLiveChatVisible) {
      showPlainLiveChat();

      return;
    }

    window.open(`mailto:${SUPPORT_EMAIL}`, '_blank noopener noreferrer');
  };

  const handleContinueAnyway = () => {
    onOpenChange(false);
    onContinueAnyway?.();
  };

  return (
    <Dialog modal open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-w-[440px] gap-4 overflow-hidden rounded-xl! p-4" hideCloseButton>
          <div className="flex items-start justify-between">
            {primaryCta === 'upgrade' ? (
              <div className="flex items-center gap-1 rounded bg-red-50 px-2 py-1">
                <RiLockStarLine className="h-3 w-3 text-pink-600" />
                <span
                  className="text-[10px] font-medium uppercase leading-normal"
                  style={{
                    background: 'linear-gradient(225deg, #FF884D 23.17%, #E300BD 80.17%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Plan limit reached
                </span>
              </div>
            ) : (
              // Softer, non-upsell badge — shown to enterprise/unlimited customers
              // for whom upgrading is not the answer.
              <div className="bg-bg-weak flex items-center gap-1 rounded px-2 py-1">
                <RiInformationLine className="text-text-soft h-3 w-3" />
                <span className="text-text-sub text-[10px] font-medium uppercase leading-normal">Limit reached</span>
              </div>
            )}
            <DialogClose>
              <Cross2Icon className="size-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>

          <div className="flex min-w-0 flex-col gap-1 overflow-hidden">
            <DialogTitle className="text-md font-medium tracking-normal">{title}</DialogTitle>
            <DialogDescription className="text-foreground-600 min-w-0 overflow-hidden">
              {description}
            </DialogDescription>
          </div>

          <DialogFooter>
            {continueLabel && onContinueAnyway && (
              <Button type="button" size="sm" mode="outline" variant="secondary" onClick={handleContinueAnyway}>
                {continueLabel}
              </Button>
            )}
            {primaryCta === 'upgrade' ? (
              <Button
                type="button"
                size="sm"
                variant="primary"
                mode="gradient"
                leadingIcon={RiSparkling2Line}
                onClick={handleUpgradeClick}
              >
                {IS_SELF_HOSTED ? 'Contact Sales' : 'Upgrade plan'}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="primary"
                leadingIcon={RiCustomerService2Line}
                onClick={handleContactSupportClick}
              >
                Contact support
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

type LimitUpgradeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planUsage: PlanUsage;
  /** Called when the user chooses to continue past the limit warning. */
  onContinueAnyway: () => void;
};

/** Soft warning — the agent can still be created but won't respond until the plan allows it. */
export function AgentLimitUpgradeDialog({ open, onOpenChange, planUsage, onContinueAnyway }: LimitUpgradeDialogProps) {
  return (
    <PlanLimitUpgradeDialog
      open={open}
      onOpenChange={onOpenChange}
      title="You've reached your agent limit"
      description={
        <>
          Your plan includes{' '}
          <span className="font-medium">
            {planUsage.limit} {planUsage.limit === 1 ? 'agent' : 'agents'}
          </span>{' '}
          and you have {planUsage.used} active. You can still create this agent, but it won&apos;t respond to messages
          until you upgrade your plan or deactivate older agents.
        </>
      }
      continueLabel="Create anyway"
      onContinueAnyway={onContinueAnyway}
      primaryCta="upgrade"
      telemetrySource="agents-limit-dialog"
      utmCampaign="agents_limit"
    />
  );
}

type AgentCreationLimitDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planUsage: AgentPlanUsage;
};

/**
 * Hard block — the creation cap is reached and the API will reject the request.
 * Plan-limited orgs get the upgrade CTA; orgs capped by the system limit
 * (enterprise/unlimited tiers or a per-org override) are pointed to the Novu
 * team instead, since upgrading cannot lift that limit.
 */
export function AgentCreationLimitDialog({ open, onOpenChange, planUsage }: AgentCreationLimitDialogProps) {
  if (planUsage.limitSource === 'system') {
    return (
      <PlanLimitUpgradeDialog
        open={open}
        onOpenChange={onOpenChange}
        title="You've reached the maximum number of agents"
        description={
          <>
            Your organization has reached the limit of{' '}
            <span className="font-medium">{planUsage.creationLimit} agents</span>. Please reach out to the Novu team —
            we&apos;re happy to help raise this limit for your organization.
          </>
        }
        primaryCta="contact-support"
        telemetrySource="agents-system-limit-dialog"
        utmCampaign="agents_system_limit"
      />
    );
  }

  return (
    <PlanLimitUpgradeDialog
      open={open}
      onOpenChange={onOpenChange}
      title="You can't create more agents on this plan"
      description={
        <>
          Your plan includes{' '}
          <span className="font-medium">
            {planUsage.limit} {planUsage.limit === 1 ? 'agent' : 'agents'}
          </span>{' '}
          and allows creating up to {planUsage.creationLimit} in total — you&apos;ve used all {planUsage.totalCreated}.
          Upgrade your plan to create more agents.
        </>
      }
      primaryCta="upgrade"
      telemetrySource="agents-creation-limit-dialog"
      utmCampaign="agents_creation_limit"
    />
  );
}

type DomainLimitDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limit: number;
  limitSource: AgentLimitSource;
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

/** Soft warning for the channels tab — the provider can still be added. */
export function ChannelLimitUpgradeDialog({
  open,
  onOpenChange,
  planUsage,
  onContinueAnyway,
}: LimitUpgradeDialogProps) {
  return (
    <PlanLimitUpgradeDialog
      open={open}
      onOpenChange={onOpenChange}
      title="You've reached your channel limit"
      description={
        <>
          Your plan includes{' '}
          <span className="font-medium">
            {planUsage.limit} active {planUsage.limit === 1 ? 'channel' : 'channels'}
          </span>{' '}
          and you have {planUsage.used} connected. You can still add this provider, but the agent won&apos;t respond on
          it until you upgrade your plan or disconnect other channels.
        </>
      }
      continueLabel="Add anyway"
      onContinueAnyway={onContinueAnyway}
      primaryCta="upgrade"
      telemetrySource="channels-limit-dialog"
      utmCampaign="channels_limit"
    />
  );
}
