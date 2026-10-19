import { useNavigate } from 'react-router-dom';
import { IS_SELF_HOSTED, SELF_HOSTED_UPGRADE_REDIRECT_URL } from '@/config';
import { useTelemetry } from '@/hooks/use-telemetry';
import { ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';
import { openInNewTab } from '@/utils/url';

export const UPGRADE_CTA_LABEL = IS_SELF_HOSTED ? 'Contact Sales' : 'Upgrade plan';

/**
 * Single home for the plan-upgrade click flow (telemetry + self-hosted
 * redirect vs in-app billing navigation), shared by every limit banner and
 * dialog so the attribution and routing never drift between surfaces.
 */
export function usePlanUpgradeClick(source: string, utmCampaign: string) {
  const navigate = useNavigate();
  const track = useTelemetry();

  return () => {
    track(TelemetryEvent.UPGRADE_TO_TEAM_TIER_CLICK, { source });

    if (IS_SELF_HOSTED) {
      openInNewTab(`${SELF_HOSTED_UPGRADE_REDIRECT_URL}?utm_campaign=${utmCampaign}`);

      return;
    }

    void navigate(`${ROUTES.SETTINGS_BILLING}?utm_campaign=${utmCampaign}`);
  };
}
