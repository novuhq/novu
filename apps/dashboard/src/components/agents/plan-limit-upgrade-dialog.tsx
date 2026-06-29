import type { AgentPlanUsage, PlanUsage } from '@/api/agents-plan-usage';
import { PlanLimitUpgradeDialog } from '@/components/billing/plan-limit-upgrade-dialog';

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
          and you have {planUsage.used} connected. You can still add this channel, but the agent won&apos;t respond on
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
