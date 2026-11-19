import { EmailProviderIdEnum, FeatureFlagsKeysEnum, SmsProviderIdEnum, ToolProviderIdEnum } from '@novu/shared';
import { useState } from 'react';
import { RiSearchLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/primitives/button';
import { IS_CLOUD } from '@/config';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { ProviderIcon } from './provider-icon';
import { ProviderRequestDialog } from './provider-request-dialog';

const TILE_SHADOW = 'shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_4px_8px_0_rgba(0,0,0,0.08),0_8px_16px_0_rgba(0,0,0,0.08)]';
// Self-hosted installs can't reach the Novu team's inbox, so they ask on GitHub.
const GITHUB_NEW_ISSUE_URL = 'https://github.com/novuhq/novu/issues/new/choose';

/** Shown when a search matches nothing installed and nothing in the store. */
export function IntegrationSearchEmptyState({ query }: { query: string }) {
  const navigate = useNavigate();
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const isToolChannelEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_TOOL_CHANNEL_ENABLED);

  const requestProvider = () =>
    IS_CLOUD ? setIsRequestOpen(true) : window.open(GITHUB_NEW_ISSUE_URL, '_blank', 'noopener,noreferrer');

  return (
    <div className="flex flex-col items-center px-4 pb-10 pt-24 text-center antialiased [font-feature-settings:'cv09'_1,'ss11'_1,'calt'_0,'liga'_0]">
      <SearchEmptyArt />

      <h2 className="text-text-strong pt-1.5 text-[18px] font-medium leading-6 tracking-[-0.27px]">
        No integrations match “{query}”
      </h2>
      <p className="text-paragraph-xs text-text-soft pt-1.5">
        {isToolChannelEnabled
          ? 'Try another name, or connect any service that accepts HTTP with a webhook.'
          : 'Try another name, or tell us which provider you need.'}
      </p>
      <div className="flex items-start gap-2 pt-3">
        <Button variant="secondary" mode="outline" size="xs" onClick={requestProvider}>
          Request a provider
        </Button>
        {isToolChannelEnabled && (
          <Button
            variant="secondary"
            mode="ghost"
            size="xs"
            onClick={() =>
              navigate(buildRoute(ROUTES.INTEGRATIONS_CONNECT_PROVIDER, { providerId: ToolProviderIdEnum.Webhook }))
            }
          >
            Use a webhook
          </Button>
        )}
      </div>

      {IS_CLOUD && (
        <ProviderRequestDialog open={isRequestOpen} onOpenChange={setIsRequestOpen} defaultProviderName={query} />
      )}
    </div>
  );
}

/** A search tile in front of two tilted provider tiles. */
function SearchEmptyArt() {
  return (
    <div className="relative h-20 w-40 shrink-0" aria-hidden="true">
      <span
        className={cn(
          'absolute left-[33px] top-[21px] flex size-11 -rotate-[8deg] items-center justify-center rounded-[10px] bg-white',
          TILE_SHADOW
        )}
      >
        <ProviderIcon providerId={EmailProviderIdEnum.SendGrid} providerDisplayName="SendGrid" className="size-[60%]" />
      </span>
      <span
        className={cn(
          'absolute left-[101px] top-[21px] flex size-11 rotate-[10deg] items-center justify-center rounded-[10px]',
          'bg-[#F22F46] bg-[linear-gradient(180deg,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0)_100%)]',
          TILE_SHADOW
        )}
      >
        <ProviderIcon
          providerId={SmsProviderIdEnum.Twilio}
          providerDisplayName="Twilio"
          className="size-[60%] [filter:brightness(0)_invert(1)]"
        />
      </span>
      <span
        className={cn(
          'text-text-sub absolute left-[54px] top-2.5 flex size-[52px] items-center justify-center rounded-xl bg-white',
          TILE_SHADOW
        )}
      >
        <RiSearchLine className="size-[22px]" />
      </span>
    </div>
  );
}
