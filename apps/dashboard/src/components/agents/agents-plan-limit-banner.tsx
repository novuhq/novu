import { useNavigate } from 'react-router-dom';
import type { AgentPlanUsage, PlanUsage } from '@/api/agents';
import { InlineToast } from '@/components/primitives/inline-toast';
import { IS_SELF_HOSTED, SELF_HOSTED_UPGRADE_REDIRECT_URL } from '@/config';
import { usePlainChat } from '@/hooks/use-plain-chat';
import { useTelemetry } from '@/hooks/use-telemetry';
import { ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';
import { openInNewTab } from '@/utils/url';

const SUPPORT_EMAIL = 'support@novu.co';

function usePlanUpgradeClick(source: string, utmCampaign: string) {
  const navigate = useNavigate();
  const track = useTelemetry();

  return () => {
    track(TelemetryEvent.UPGRADE_TO_TEAM_TIER_CLICK, { source });

    if (IS_SELF_HOSTED) {
      openInNewTab(`${SELF_HOSTED_UPGRADE_REDIRECT_URL}?utm_campaign=${utmCampaign}`);

      return;
    }

    navigate(`${ROUTES.SETTINGS_BILLING}?utm_source=${utmCampaign}`);
  };
}

function useContactSupportClick() {
  const { isLiveChatVisible, showPlainLiveChat } = usePlainChat();

  return () => {
    if (isLiveChatVisible) {
      showPlainLiveChat();

      return;
    }

    window.location.href = `mailto:${SUPPORT_EMAIL}`;
  };
}

const UPGRADE_CTA_LABEL = IS_SELF_HOSTED ? 'Contact Sales' : 'Upgrade plan';

type PlanLimitBannerProps = {
  planUsage: PlanUsage;
};

type AgentsPlanLimitBannerProps = {
  planUsage: AgentPlanUsage;
};

/** Org-wide over-limit warning shown on the agents list page. */
export function AgentsPlanLimitBanner({ planUsage }: AgentsPlanLimitBannerProps) {
  const handleUpgradeClick = usePlanUpgradeClick('agents-limit-banner', 'agents_limit');
  const handleContactSupportClick = useContactSupportClick();
  const overCount = planUsage.used - planUsage.limit;
  const overLabel = overCount === 1 ? 'Your most recent active agent' : `Your ${overCount} most recent active agents`;
  const limitLabel = planUsage.limit === 1 ? 'agent' : 'agents';

  // System-capped orgs (enterprise/unlimited tiers or per-org overrides) can't
  // lift the limit by upgrading — point them to the Novu team instead.
  if (planUsage.limitSource === 'system') {
    return (
      <InlineToast
        variant="warning"
        title="Agent limit exceeded."
        description={`Your organization is limited to ${planUsage.limit} active agents and you have ${planUsage.used}. ${overLabel} won't respond to messages. Reach out to the Novu team to raise this limit.`}
        ctaLabel="Contact support"
        onCtaClick={handleContactSupportClick}
      />
    );
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

/** Per-agent over-limit warning shown on the agent details page. */
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
