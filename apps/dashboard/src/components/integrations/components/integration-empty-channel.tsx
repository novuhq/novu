import { ChannelTypeEnum, PermissionsEnum } from '@novu/shared';
import { RiAddLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/primitives/button';
import { PermissionButton } from '@/components/primitives/permission-button';
import { useEnvironment } from '@/context/environment/hooks';
import { ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { ChannelSectionHeader } from './integration-channel-group';
import { ProviderIcon } from './provider-icon';
import { EMPTY_CHANNEL_CONTENT } from './utils/empty-channel-content';

const FLYOUT_SHADOW = 'shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_4px_8px_0_rgba(0,0,0,0.08),0_8px_16px_0_rgba(0,0,0,0.08)]';

/** Section for a channel with no installed provider: header, art, copy and the way to add one. */
export function IntegrationEmptyChannel({ channel }: { channel: ChannelTypeEnum }) {
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();
  const content = EMPTY_CHANNEL_CONTENT[channel];
  // Inbox isn't in the connect sheet; it has its own setup flow.
  const actionRoute =
    channel === ChannelTypeEnum.IN_APP
      ? `${ROUTES.INBOX_EMBED}?environmentId=${currentEnvironment?._id ?? ''}`
      : `${ROUTES.INTEGRATIONS_CONNECT}?channel=${channel}`;

  return (
    <div className="space-y-4">
      <ChannelSectionHeader channel={channel} count={0} />
      <div className="border-stroke-soft bg-bg-weak relative flex min-h-[166px] items-center gap-10 overflow-hidden rounded-xl border pr-6">
        {/* Dot grid fading out towards the copy. */}
        <div className="absolute inset-0 bg-[radial-gradient(#d4d4d8_1px,transparent_1px)] bg-[size:12px_12px]" />
        <div className="to-bg-weak absolute inset-0 bg-gradient-to-r from-transparent to-45%" />

        <EmptyChannelArt providers={content.providers} />

        <div className="relative flex min-w-0 flex-col gap-1.5 py-6 pl-6 md:pl-0">
          <h3 className="text-label-md text-text-strong">{content.title}</h3>
          <p className="text-paragraph-xs text-text-sub max-w-[440px]">{content.description}</p>
          <div className="flex flex-wrap items-start gap-2 pt-1.5">
            <PermissionButton
              permission={PermissionsEnum.INTEGRATION_WRITE}
              variant="primary"
              mode="gradient"
              size="xs"
              onClick={() => navigate(actionRoute)}
            >
              {content.actionLabel}
            </PermissionButton>
            <Button
              variant="secondary"
              mode="ghost"
              size="xs"
              onClick={() => window.open(content.docsUrl, '_blank', 'noopener,noreferrer')}
            >
              {content.docsLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Two tilted blank cards with up to three provider tiles and a "+" on top. */
function EmptyChannelArt({ providers }: { providers: [string, ...string[]] }) {
  const [center, left, right] = providers;

  return (
    <div className="relative ml-[39px] hidden h-[166px] w-[240px] shrink-0 md:block" aria-hidden="true">
      <SkeletonCard className="left-[13px] top-[44px] rotate-6" />
      <SkeletonCard className="left-[136px] top-[30px] -rotate-5" />
      {left && <ProviderTile providerId={left} className="left-[63px] top-[44px] -rotate-10" />}
      {right && <ProviderTile providerId={right} className="left-[136px] top-[51px] rotate-10" />}
      <ProviderTile providerId={center} className="left-[100px] top-[40px]" />
      <span
        className={cn(
          'absolute left-[130px] top-[72px] flex size-6 items-center justify-center rounded-full bg-gradient-to-r from-[#de2666] to-[#fa5940] text-white',
          FLYOUT_SHADOW
        )}
      >
        <RiAddLine className="size-3.5" />
      </span>
    </div>
  );
}

function SkeletonCard({ className }: { className: string }) {
  return (
    <div
      className={cn('absolute h-[88px] w-24 rounded-[10px] bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.08)]', className)}
    >
      <span className="bg-bg-weak absolute left-3 top-12 h-[5px] w-14 rounded-[3px]" />
      <span className="bg-bg-weak absolute left-3 top-[60px] h-[5px] w-10 rounded-[3px]" />
      <span className="bg-bg-weak absolute left-3 top-[72px] h-[5px] w-12 rounded-[3px]" />
    </div>
  );
}

function ProviderTile({ providerId, className }: { providerId: string; className: string }) {
  return (
    <div
      className={cn(
        'absolute flex size-10 items-center justify-center rounded-[10px] bg-white',
        FLYOUT_SHADOW,
        className
      )}
    >
      <ProviderIcon providerId={providerId} providerDisplayName={providerId} className="size-6" />
    </div>
  );
}
