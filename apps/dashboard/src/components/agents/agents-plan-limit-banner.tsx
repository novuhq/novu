import type { AgentPlanUsage, PlanUsage } from '@/api/agents-plan-usage';
import { UPGRADE_CTA_LABEL, usePlanUpgradeClick } from '@/components/billing/use-plan-upgrade-click';
import { InlineToast } from '@/components/primitives/inline-toast';

type PlanLimitBannerProps = {
  planUsage: PlanUsage;
};

type AgentsPlanLimitBannerProps = {
  planUsage: AgentPlanUsage;
};

/** Org-wide over-limit warning shown on the agents list page. */
export function AgentsPlanLimitBanner({ planUsage }: AgentsPlanLimitBannerProps) {
  const handleUpgradeClick = usePlanUpgradeClick('agents-limit-banner', 'agents_limit');
  const overCount = planUsage.used - planUsage.limit;
  const overLabel = overCount === 1 ? 'Your most recent active agent' : `Your ${overCount} most recent active agents`;
  const limitLabel = planUsage.limit === 1 ? 'agent' : 'agents';

  // System-capped orgs (enterprise/unlimited tiers or per-org overrides) can't
  // act on this banner — upgrading doesn't lift a system cap — so don't show it.
  if (planUsage.limitSource === 'system') {
    return null;
  }

  return (
    <InlineToast
      variant="warning"
      title="Agent limit exceeded."
      description={`Your plan includes ${planUsage.limit} ${limitLabel} and you have ${planUsage.used} active. ${overLabel} won't respond to messages until you upgrade or deactivate older agents.`}
      ctaLabel={UPGRADE_CTA_LABEL}
      onCtaClick={handleUpgradeClick}
    />
  );
}

/**
 * Per-agent over-limit warning shown on the agent details page. Only renders
 * for plan-limited orgs — the backend never flags system-capped agents as
 * over-limit (`exceedsPlanLimit` implies a plan limit).
 */
export function AgentExceedsPlanBanner() {
  const handleUpgradeClick = usePlanUpgradeClick('agent-details-limit-banner', 'agents_limit');

  return (
    <InlineToast
      variant="warning"
      title="This agent exceeds your plan limit."
      description="It won't respond to messages until you upgrade your plan or deactivate older agents."
      ctaLabel={UPGRADE_CTA_LABEL}
      onCtaClick={handleUpgradeClick}
    />
  );
}

/** Org-wide over-limit warning shown on the agent channels tab. */
export function ChannelsPlanLimitBanner({ planUsage }: PlanLimitBannerProps) {
  const handleUpgradeClick = usePlanUpgradeClick('channels-limit-banner', 'channels_limit');
  const overCount = planUsage.used - planUsage.limit;
  const overLabel =
    overCount === 1 ? 'Your most recently connected channel' : `Your ${overCount} most recently connected channels`;
  const limitLabel = planUsage.limit === 1 ? 'active channel' : 'active channels';

  return (
    <InlineToast
      variant="warning"
      title="Channel limit exceeded."
      description={`Your plan includes ${planUsage.limit} ${limitLabel} and you have ${planUsage.used} connected. ${overLabel} won't receive replies until you upgrade or disconnect other channels.`}
      ctaLabel={UPGRADE_CTA_LABEL}
      onCtaClick={handleUpgradeClick}
    />
  );
}
