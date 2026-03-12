import { RiSparkling2Line } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/primitives/button';
import { ROUTES } from '@/utils/routes';
import { openInNewTab } from '@/utils/url';
import { IS_SELF_HOSTED, SELF_HOSTED_UPGRADE_REDIRECT_URL } from '../../config';
import { useTelemetry } from '../../hooks/use-telemetry';
import { TelemetryEvent } from '../../utils/telemetry';
import { EmptyStateSvg } from './webhooks-empty-state-svg';

export { EmptyStateSvg } from './webhooks-empty-state-svg';

export function WebhooksPaywallState() {
  const track = useTelemetry();
  const navigate = useNavigate();

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 px-4">
      <div className="flex w-full max-w-[480px] flex-col items-center gap-6 text-center">
        <div className="flex w-full flex-col gap-3">
          <div className="flex flex-col items-center gap-2">
            <div className="mb-[50px]">
              <EmptyStateSvg />
            </div>
            <h2 className="text-foreground-900 text-label-md">Webhooks</h2>
            <p className="text-text-soft text-label-xs mb-3 max-w-[300px]">
              Get webhook events about important events in your Novu instance, including message deliveries, workflow
              updates, and subscriber changes.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <p className="text-text-soft text-label-xs mb-3 text-center">To create webhooks, upgrade your plan.</p>
          <Button
            variant="primary"
            mode="gradient"
            size="xs"
            className="mb-3.5"
            onClick={() => {
              track(TelemetryEvent.UPGRADE_TO_TEAM_TIER_CLICK, {
                source: 'webhooks-page',
              });

              if (IS_SELF_HOSTED) {
                openInNewTab(SELF_HOSTED_UPGRADE_REDIRECT_URL + '?utm_campaign=webhooks');
              } else {
                navigate(ROUTES.SETTINGS_BILLING);
              }
            }}
            leadingIcon={RiSparkling2Line}
          >
            {IS_SELF_HOSTED ? 'Contact Sales' : 'Upgrade to Team Tier'}
          </Button>
        </div>
      </div>
    </div>
  );
}
