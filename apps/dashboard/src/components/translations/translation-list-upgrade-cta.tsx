import { LinkButton } from '@/components/primitives/button-link';
import { RiBookMarkedLine, RiSparkling2Line } from 'react-icons/ri';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyTranslationsIllustration } from './empty-translations-illustration';
import { Button } from '../primitives/button';
import { TelemetryEvent } from '@/utils/telemetry';
import { ROUTES } from '@/utils/routes';
import { useTelemetry } from '@/hooks/use-telemetry';
import { IS_SELF_HOSTED, SELF_HOSTED_UPGRADE_REDIRECT_URL } from '@/config';
import { openInNewTab } from '@/utils/url';

export const TranslationListUpgradeCta = () => {
  const track = useTelemetry();
  const navigate = useNavigate();

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6">
      <EmptyTranslationsIllustration />

      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-text-sub text-label-md block font-medium">
          One language is good. Speaking your users’ language? Better.
        </span>
        <p className="text-text-soft text-paragraph-sm max-w-[60ch]">
          Upgrade now and start speaking your users’ language(s).
        </p>
      </div>

      <div className="flex flex-col items-center gap-1">
        <Button
          variant="primary"
          mode="gradient"
          size="xs"
          className="mb-3.5"
          onClick={() => {
            track(TelemetryEvent.UPGRADE_TO_TEAM_TIER_CLICK, {
              source: 'environments-page',
            });

            if (IS_SELF_HOSTED) {
              openInNewTab(SELF_HOSTED_UPGRADE_REDIRECT_URL + '?utm_campaign=translations');
            } else {
              navigate(ROUTES.SETTINGS_BILLING);
            }
          }}
          leadingIcon={RiSparkling2Line}
        >
          {IS_SELF_HOSTED ? 'Contact Sales' : 'Upgrade now'}
        </Button>
        <Link to={'https://docs.novu.co/platform/translations'} target="_blank">
          <LinkButton size="sm" leadingIcon={RiBookMarkedLine}>
            How does this help?
          </LinkButton>
        </Link>
      </div>
    </div>
  );
};
