import {
  ChatProviderIdEnum,
  EmailProviderIdEnum,
  PermissionsEnum,
  PushProviderIdEnum,
  SmsProviderIdEnum,
} from '@novu/shared';
import type { ComponentType, ReactNode } from 'react';
import { useState } from 'react';
import { RiAddLine, RiArrowRightUpLine, RiCheckboxCircleFill, RiSettings4Line, RiStore3Line } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { STEP_TYPE_TO_ICON } from '@/components/icons/utils';
import { Button } from '@/components/primitives/button';
import { PermissionButton } from '@/components/primitives/permission-button';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { useEnvironment } from '@/context/environment/hooks';
import { StepTypeEnum } from '@/utils/enums';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { ProviderIcon } from './provider-icon';
import { buildCursorPromptLink, buildInboxSetupPrompt } from './utils/inbox-setup-prompt';

const INBOX_DOCS_URL = 'https://docs.novu.co/platform/inbox/overview';
const CARD_SHADOW = 'shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_4px_0_rgba(0,0,0,0.04)]';

/**
 * Getting-started cards, shown above the channel list while the environment has no real (non-demo)
 * integrations. `isInboxConnected` flips the Inbox card to its success state.
 */
export function IntegrationStoreZeroState({ isInboxConnected }: { isInboxConnected: boolean }) {
  return (
    // Grayscale smoothing and Inter's cv09/ss11 match how the design renders text; subpixel smoothing makes
    // light-on-colour text (the mock's buttons, the bubble) look heavier than in Figma.
    <div className="flex flex-col items-center gap-7 pt-4 antialiased [font-feature-settings:'cv09'_1,'ss11'_1,'calt'_0,'liga'_0]">
      <h2 className="text-center text-2xl font-medium leading-8 tracking-[-0.36px]">
        <span className="text-text-strong block">One integration per channel.</span>
        <span className="text-text-soft block">Novu delivers every notification.</span>
      </h2>
      <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
        {isInboxConnected ? <InboxConnectedCard /> : <InboxCard />}
        <ChannelsCard />
      </div>
    </div>
  );
}

function ZeroStateCard({
  illustration,
  tagIcon: TagIcon,
  tag,
  title,
  description,
  actions,
}: {
  illustration: ReactNode;
  tagIcon: ComponentType<{ className?: string }>;
  tag: string;
  title: string;
  description: string;
  actions: ReactNode;
}) {
  return (
    <div className="border-stroke-soft bg-bg-white flex flex-col overflow-hidden rounded-[10px] border">
      <div className="border-stroke-soft bg-bg-weak relative h-[280px] overflow-hidden border-b" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(#d4d4d8_1px,transparent_1px)] bg-[size:12px_12px]" />
        {/* Fixed-size stage, centred, so the scattered art keeps its layout at any card width. */}
        <div className="absolute left-1/2 top-0 h-[280px] w-[576px] -translate-x-1/2">
          <Orbits />
          {illustration}
        </div>
      </div>
      <div className="flex flex-col items-start gap-2.5 p-5">
        <span className="border-stroke-soft text-label-sm text-text-sub flex items-center gap-1 rounded-md border py-[3px] pl-1.5 pr-2">
          <TagIcon className="size-3.5" />
          {tag}
        </span>
        <h3 className="text-label-md text-text-strong">{title}</h3>
        <p className="text-paragraph-sm text-text-soft">{description}</p>
        <div className="flex flex-wrap items-center gap-1.5 pt-1.5">{actions}</div>
      </div>
    </div>
  );
}

/** Two faint concentric rings behind the art. */
function Orbits() {
  return (
    <>
      <OrbitRing size={440} className="left-[68px] top-[-70px]" />
      <OrbitRing size={280} className="left-[148px] top-[10px]" />
    </>
  );
}

/** A dashed ring drawn in SVG, so the dash length can be set (a CSS dashed border can't). */
function OrbitRing({ size, className }: { size: number; className: string }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" className={cn('absolute', className)}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2 - 0.5}
        stroke="hsl(var(--stroke-soft))"
        strokeWidth="1"
        strokeDasharray="6 4"
      />
    </svg>
  );
}

function InboxCard() {
  const { currentEnvironment } = useEnvironment();
  const [isCopied, setIsCopied] = useState(false);
  const prompt = buildInboxSetupPrompt(currentEnvironment?.identifier ?? 'YOUR_APPLICATION_IDENTIFIER');

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      showErrorToast("Couldn't copy the prompt.");
    }
  };

  return (
    <ZeroStateCard
      illustration={<InboxIllustration />}
      tagIcon={BellAlertIcon}
      tag="Inbox"
      title="Add the Inbox to your app"
      description="Paste one prompt into Claude Code, Cursor or any agent. It installs Novu and adds <Inbox /> with your application identifier."
      actions={
        <>
          <button
            type="button"
            onClick={copyPrompt}
            className="text-label-xs flex h-7 items-center justify-center rounded-md bg-[#0e121b] bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0)_100%)] px-3 text-white shadow-[0_1px_2px_0_rgba(27,28,29,0.48),0_0_0_1px_#242628]"
          >
            {isCopied ? 'Copied!' : 'Copy prompt'}
          </button>
          <a
            href={buildCursorPromptLink(prompt)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-label-xs text-text-sub flex h-7 items-center gap-1 rounded-md bg-white px-2 shadow-[0_1px_3px_0_rgba(14,18,27,0.12),0_0_0_1px_hsl(var(--stroke-soft))]"
          >
            <img src="/images/cursor-icon.svg" alt="" className="size-4" />
            Open in Cursor
          </a>
          <Button
            variant="secondary"
            mode="ghost"
            size="xs"
            trailingIcon={RiArrowRightUpLine}
            onClick={() => window.open(INBOX_DOCS_URL, '_blank', 'noopener,noreferrer')}
          >
            Read docs
          </Button>
        </>
      }
    />
  );
}

/** The Inbox card once the Inbox has connected while the user is on the page. */
function InboxConnectedCard() {
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();

  return (
    <ZeroStateCard
      illustration={<InboxIllustration />}
      tagIcon={ConnectedIcon}
      tag="Inbox connected"
      title="Your Inbox is receiving notifications"
      description="Notifications from your workflows now show up in your app."
      actions={
        <>
          <PermissionButton
            permission={PermissionsEnum.WORKFLOW_WRITE}
            variant="primary"
            mode="gradient"
            size="xs"
            onClick={() =>
              navigate(buildRoute(ROUTES.WORKFLOWS_CREATE, { environmentSlug: currentEnvironment?.slug ?? '' }))
            }
          >
            Create a workflow
          </PermissionButton>
          <Button
            variant="secondary"
            mode="ghost"
            size="xs"
            trailingIcon={RiArrowRightUpLine}
            onClick={() => window.open(INBOX_DOCS_URL, '_blank', 'noopener,noreferrer')}
          >
            Read docs
          </Button>
        </>
      }
    />
  );
}

function ConnectedIcon({ className }: { className?: string }) {
  return <RiCheckboxCircleFill className={cn('text-success', className)} />;
}

/** A tilted Inbox mock with a first notification, and a bell with an unread badge. */
function InboxIllustration() {
  return (
    <>
      <div className={cn('absolute left-[125px] top-[54px] w-[340px] rotate-2 rounded-[10px] bg-white', CARD_SHADOW)}>
        <div className="flex items-center gap-1 pl-3.5 pr-3 pt-3.5">
          <span className="text-text-strong text-[15px] font-medium leading-5 tracking-[-0.09px]">Inbox</span>
          <ChevronDownIcon className="text-text-sub size-3.5" />
          <span className="flex-1" />
          <EllipsisIcon className="text-text-sub size-4" />
          <RiSettings4Line className="text-text-sub ml-2 size-4" />
        </div>
        <div className="border-stroke-soft flex gap-5 border-b pl-3.5 pt-3">
          <span className="flex flex-col gap-2">
            <span className="text-label-sm text-text-strong flex items-center gap-[5px]">
              All
              <span className="bg-error-base flex size-4 items-center justify-center rounded-full text-[10px] leading-3 text-white">
                1
              </span>
            </span>
            <span className="bg-[#dd2450] h-0.5" />
          </span>
          <span className="text-label-sm text-text-sub pb-2.5">Alerts</span>
          <span className="text-label-sm text-text-sub pb-2.5">Newsletter</span>
        </div>
        <div className="bg-bg-weak flex gap-2.5 rounded-b-[10px] p-3.5 pb-24">
          <span className="border-stroke-soft flex size-7 shrink-0 items-center justify-center rounded-full border bg-white text-sm">
            🎉
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <span className="text-label-sm text-text-strong">Looks good, doesn’t it?</span>
            <span className="text-paragraph-sm text-text-sub">
              Now imagine this inside your app. Next: embed the inbox with 2 lines of code.
            </span>
            <span className="flex gap-2 pb-1 pt-2">
              <span className="bg-[#dd2450] flex h-7 items-center rounded-md bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0)_100%)] px-2 text-[13px] font-medium leading-[1.1] text-white shadow-[0_1px_2px_0_rgba(184,30,66,0.4),0_0_0_1px_#b81e42]">
                Implement &lt;Inbox /&gt;
              </span>
              <span className="flex h-7 items-center rounded-md bg-white px-2 text-[13px] font-medium leading-[1.1] text-[#18181b] shadow-[0_1px_2px_0_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.08)]">
                Read docs
              </span>
            </span>
            <span className="text-paragraph-xs text-text-soft">Today at 9:42 AM</span>
          </div>
          <span className="bg-[#dd2450] mt-1.5 size-1.5 shrink-0 rounded-full" />
        </div>
      </div>
      <div
        className={cn(
          'absolute left-[451px] top-[40px] flex size-9 -rotate-6 items-center justify-center rounded-lg bg-white',
          CARD_SHADOW
        )}
      >
        <BellAlertIcon className="text-text-sub size-[18px]" />
        <span className="bg-error-base absolute -right-1.5 -top-2.5 flex h-[18px] min-w-5 items-center justify-center rounded-full border-2 border-white px-1 text-[10px] leading-[14px] text-white">
          2
        </span>
      </div>
    </>
  );
}

function ChannelsCard() {
  const navigate = useNavigate();

  return (
    <ZeroStateCard
      illustration={<ChannelsIllustration />}
      tagIcon={RiStore3Line}
      tag="Channels"
      title="Connect your other channels"
      description="Email, SMS, Push and Chat. Connect a provider once per environment and every workflow can send through it."
      actions={
        <PermissionButton
          permission={PermissionsEnum.INTEGRATION_WRITE}
          variant="secondary"
          mode="outline"
          size="xs"
          leadingIcon={RiAddLine}
          onClick={() => navigate(ROUTES.INTEGRATIONS_CONNECT)}
        >
          Add provider
        </PermissionButton>
      }
    />
  );
}

// Positions from the design. `tile` overrides the white tile; `icon` sizes or recolours the logo; `logo` replaces it.
const CHANNEL_TILES: { providerId: string; className: string; tile?: string; icon?: string; logo?: ReactNode }[] = [
  { providerId: ChatProviderIdEnum.Slack, className: 'left-[73px] top-[55px] size-[52px] rotate-[8deg]' },
  { providerId: EmailProviderIdEnum.SendGrid, className: 'left-[153px] top-[123px] size-[60px] -rotate-6' },
  {
    providerId: SmsProviderIdEnum.Twilio,
    className: 'left-[257px] top-[152px] size-[72px] rotate-[4deg]',
    tile: 'bg-[#F22F46] bg-[linear-gradient(180deg,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0)_100%)]',
    icon: '[filter:brightness(0)_invert(1)]',
  },
  {
    // The store's Resend icon has its own bordered square, so the design's bare mark goes on a dark tile instead.
    providerId: EmailProviderIdEnum.Resend,
    className: 'left-[344px] top-[74px] size-16 -rotate-[8deg]',
    tile: 'bg-[#0f0f0f] bg-[linear-gradient(180deg,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0)_100%)]',
    logo: <ResendMark className="size-[60%]" />,
  },
  { providerId: EmailProviderIdEnum.Postmark, className: 'left-[443px] top-[43px] size-[52px] rotate-6' },
  { providerId: ChatProviderIdEnum.MsTeams, className: 'left-[462px] top-[152px] size-14 -rotate-[5deg]' },
  {
    providerId: ChatProviderIdEnum.WhatsAppBusiness,
    className: 'left-[73px] top-[178px] size-[52px] -rotate-[7deg]',
  },
  { providerId: PushProviderIdEnum.FCM, className: 'left-[229px] top-[52px] size-12 rotate-[10deg]' },
];

const CHANNEL_CHIPS: { label: string; step: StepTypeEnum; color: string; className: string }[] = [
  { label: 'Email', step: StepTypeEnum.EMAIL, color: 'text-[#335CFF]', className: 'left-[120px] top-[204px] rotate-3' },
  {
    label: 'SMS',
    step: StepTypeEnum.SMS,
    color: 'text-[#F2642D]',
    className: 'left-[395px] top-[179px] -rotate-[4deg]',
  },
  {
    label: 'Push',
    step: StepTypeEnum.PUSH,
    color: 'text-[#0EA5E9]',
    className: 'left-[29px] top-[120px] rotate-[5deg]',
  },
  { label: 'Chat', step: StepTypeEnum.CHAT, color: 'text-feature', className: 'left-[480px] top-[105px] -rotate-3' },
];

/** Provider tiles and channel chips scattered around a "Send it everywhere" bubble. */
function ChannelsIllustration() {
  return (
    <>
      {CHANNEL_TILES.map(({ providerId, className, tile, icon, logo }) => (
        <div
          key={providerId}
          className={cn(
            'absolute flex items-center justify-center overflow-hidden rounded-[10px] bg-white',
            CARD_SHADOW,
            className,
            tile
          )}
        >
          {logo ?? (
            <ProviderIcon providerId={providerId} providerDisplayName={providerId} className={cn('size-[60%]', icon)} />
          )}
        </div>
      ))}
      {CHANNEL_CHIPS.map(({ label, step, color, className }) => {
        const Icon = STEP_TYPE_TO_ICON[step];

        return (
          <span
            key={label}
            className={cn(
              'text-label-xs text-text-sub absolute flex items-center gap-1 rounded-md bg-white py-1 pl-1.5 pr-2',
              CARD_SHADOW,
              className
            )}
          >
            {Icon && (
              <span className="flex size-3.5 items-center justify-center rounded-[3.5px] bg-[#f4f4f5] bg-[linear-gradient(180deg,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0)_100%)]">
                <Icon className={cn('size-2.5', color)} />
              </span>
            )}
            {label}
          </span>
        );
      })}
      <span
        className={cn(
          'bg-[#dd2450] text-label-sm absolute left-[302px] top-[24px] rotate-3 rounded-[10px] rounded-bl-[2px] px-3 py-1.5 text-white',
          CARD_SHADOW
        )}
      >
        Send it everywhere
      </span>
    </>
  );
}

// Icons from the design, which are lighter than the Remix glyphs used elsewhere.

function BellAlertIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" fill="currentColor" aria-hidden="true" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.4 -0.18322C5.10508 -0.18322 2.43333 2.48852 2.43333 5.78345V10.8501C2.43333 11.5317 1.88161 12.0834 1.2 12.0834C0.702943 12.0834 0.3 12.4864 0.3 12.9834C0.3 13.4805 0.702943 13.8834 1.2 13.8834H15.6C16.0971 13.8834 16.5 13.4805 16.5 12.9834C16.5 12.4864 16.0971 12.0834 15.6 12.0834C14.9184 12.0834 14.3667 11.5317 14.3667 10.8501V5.78345C14.3667 2.48852 11.6949 -0.18322 8.4 -0.18322ZM12.5667 10.8501C12.5667 11.2893 12.6599 11.7067 12.8277 12.0834H3.97227C4.14007 11.7067 4.23333 11.2893 4.23333 10.8501V5.78345C4.23333 3.48264 6.09919 1.61678 8.4 1.61678C10.7008 1.61678 12.5667 3.48264 12.5667 5.78345V10.8501ZM9.68003 14.8499C9.8411 14.8499 9.99256 14.9224 10.0939 15.0472C10.1952 15.172 10.2358 15.3363 10.2027 15.4931C10.0182 16.3699 9.27683 16.9832 8.4011 16.9832C7.52536 16.9832 6.78403 16.3699 6.5995 15.4931C6.56643 15.3363 6.6059 15.172 6.70723 15.0472C6.80856 14.9224 6.96003 14.8499 7.1211 14.8499H9.68003Z"
        transform="translate(0.6 0.5)"
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden="true" className={className}>
      <path
        d="M3.5 5.25L7 8.75L10.5 5.25"
        stroke="currentColor"
        strokeWidth="0.91"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EllipsisIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className={className}>
      <circle cx="2.548" cy="8" r="1.274" />
      <circle cx="8" cy="8" r="1.274" />
      <circle cx="13.452" cy="8" r="1.274" />
    </svg>
  );
}

function ResendMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 38.4019 38.4" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M23.4874 0C30.925 0 35.3485 4.42324 35.3485 10.2948C35.3485 16.1664 30.925 20.5896 23.4874 20.5896H19.7294L38.4019 38.4H25.2099L10.9999 24.8955C9.9822 23.956 9.51237 22.86 9.51237 21.9205C9.51237 20.5896 10.4519 19.4154 12.2526 18.9065L19.5728 16.9493C22.3521 16.2055 24.2703 14.0526 24.2703 11.2343C24.2703 7.78962 21.4518 5.79324 17.9678 5.79324H0V0H23.4874Z"
        fill="#FDFDFD"
      />
    </svg>
  );
}
