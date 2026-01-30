import { RiBookMarkedLine, RiSettings4Line, RiSparkling2Line } from 'react-icons/ri';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LinkButton } from '@/components/primitives/button-link';
import { IS_SELF_HOSTED, SELF_HOSTED_UPGRADE_REDIRECT_URL } from '@/config';
import { useTelemetry } from '@/hooks/use-telemetry';
import { buildRoute, ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';
import { openInNewTab } from '@/utils/url';
import { Button } from '../primitives/button';
import { EmptyTranslationsIllustration } from './empty-translations-illustration';

export const TranslationListUpgradeCta = () => {
  const track = useTelemetry();
  const navigate = useNavigate();
  const { environmentSlug } = useParams<{ environmentSlug: string }>();

  // For self-hosted (ReNovu): show configure button instead of upgrade
  if (IS_SELF_HOSTED) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-6">
        <EmptyTranslationsIllustration />

        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-text-sub text-label-md block font-medium">
            Enable AI-powered translations
          </span>
          <p className="text-text-soft text-paragraph-sm max-w-[60ch]">
            Configure your OpenAI API key to unlock automatic translations for your notification content.
          </p>
        </div>

        <div className="flex flex-col items-center gap-1">
          <Button
            variant="primary"
            mode="gradient"
            size="xs"
            className="mb-3.5"
            onClick={() => {
              if (environmentSlug) {
                navigate(buildRoute(ROUTES.TRANSLATION_SETTINGS, { environmentSlug }));
              }
            }}
            leadingIcon={RiSettings4Line}
          >
            Configure Translation Settings
          </Button>
          <Link to={'https://docs.novu.co/platform/workflow/translations'} target="_blank">
            <LinkButton size="sm" leadingIcon={RiBookMarkedLine}>
              How does this help?
            </LinkButton>
          </Link>
        </div>
      </div>
    );
  }

  // For cloud (Novu): show upgrade CTA
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6">
      <EmptyTranslationsIllustration />

      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-text-sub text-label-md block font-medium">
          One language is good. Speaking your users' language? Better.
        </span>
        <p className="text-text-soft text-paragraph-sm max-w-[60ch]">
          Unlock multi-language support and deliver personalized experiences in your users' preferred language.
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
            navigate(ROUTES.SETTINGS_BILLING);
          }}
          leadingIcon={RiSparkling2Line}
        >
          Upgrade now
        </Button>
        <Link to={'https://docs.novu.co/platform/workflow/translations'} target="_blank">
          <LinkButton size="sm" leadingIcon={RiBookMarkedLine}>
            How does this help?
          </LinkButton>
        </Link>
      </div>
    </div>
  );
};
