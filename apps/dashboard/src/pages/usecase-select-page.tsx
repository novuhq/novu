import { FeatureFlagsKeysEnum, ProductUseCasesEnum } from '@novu/shared';
import {
  Bot,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Settings,
  Smartphone,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { RiArrowLeftSLine, RiCheckLine } from 'react-icons/ri';
import { Navigate, useNavigate } from 'react-router-dom';
import { BOOK_DEMO_URL } from '@/components/header-navigation/support-drawer-constants';
import { AwsIcon } from '@/components/icons/aws';
import { ClaudeIcon } from '@/components/icons/claude';
import { LogoCircle } from '@/components/icons/logo-circle';
import { Notification5Fill } from '@/components/icons/notification-5-fill';
import { AgentUsecasePreviewIllustration } from '@/components/onboarding/agent-usecase-preview-illustration';
import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { PageMeta } from '@/components/page-meta';
import { IS_EU } from '@/config';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useOnboardingProvisioningActive, useOnboardingProvisioningDismiss } from '@/hooks/use-onboarding-provisioning';
import { useTelemetry } from '@/hooks/use-telemetry';
import { useUpdateProductUseCases } from '@/hooks/use-update-product-use-cases';
import { beginOnboardingProvisioning } from '@/utils/connect/onboarding-session';
import { ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';

function SubscriberAvatar() {
  return (
    <svg className="size-4 shrink-0" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M0 8C0 3.58172 3.58172 0 8 0C12.4183 0 16 3.58172 16 8C16 12.4183 12.4183 16 8 16C3.58172 16 0 12.4183 0 8Z"
        fill="#E1E4EA"
      />
      <g clipPath="url(#sub-avatar-clip)">
        <ellipse cx="8" cy="15.6" rx="6.4" ry="4.8" fill="white" fillOpacity="0.72" />
        <circle opacity="0.9" cx="8" cy="6.4" r="3.2" fill="white" />
      </g>
      <defs>
        <clipPath id="sub-avatar-clip">
          <rect width="16" height="16" rx="8" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

function Pill({ icon, children, rotate = 0 }: { icon?: React.ReactNode; children: React.ReactNode; rotate?: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded border border-[#e8ebef] bg-[#f8f9fa] px-1 py-0.5 align-middle text-xs font-medium text-[#3a3f47]"
      style={rotate ? { transform: `rotate(${rotate}deg)` } : undefined}
    >
      {icon}
      {children}
    </span>
  );
}

function FeatureList() {
  return (
    <div className="flex flex-col gap-1 px-4 text-xs font-medium text-[#525866]">
      <div className="flex min-h-6 items-center gap-1.5">
        <RiCheckLine className="size-3 shrink-0 text-[#b0b8c4]" />
        <span className="flex flex-wrap items-center gap-1">
          Cross-channel conversations across
          <Pill icon={<img src="/images/providers/light/square/slack.svg" alt="" className="size-4" />} rotate={-1}>
            Slack
          </Pill>
          <Pill
            icon={<img src="/images/providers/light/square/whatsapp-business.svg" alt="" className="size-4" />}
            rotate={1}
          >
            Whatsapp
          </Pill>
          and a lot more.
        </span>
      </div>
      <div className="flex min-h-6 items-center gap-1.5">
        <RiCheckLine className="size-3 shrink-0 text-[#b0b8c4]" />
        <span className="flex flex-wrap items-center gap-1">
          Bring agents from
          <Pill icon={<ClaudeIcon className="size-4" />} rotate={-1}>
            Claude
          </Pill>
          <Pill icon={<AwsIcon className="size-4" />} rotate={-1}>
            Bedrock
          </Pill>
          or custom agents via agent() handler.
        </span>
      </div>
      <div className="flex min-h-6 items-center gap-1.5">
        <RiCheckLine className="size-3 shrink-0 text-[#b0b8c4]" />
        <span className="flex flex-wrap items-center gap-1">
          Provider identities resolved →
          <Pill icon={<SubscriberAvatar />} rotate={1}>
            Subscriber
          </Pill>
          mapping.
        </span>
      </div>
    </div>
  );
}

function InboxPreview() {
  return (
    <div className="flex w-[375px] flex-col gap-1">
      <div className="flex items-center justify-between px-1 py-1">
        <span className="font-mono text-sm uppercase text-[#99a0ae]">{'<Inbox />'}</span>
        <span className="font-mono text-sm uppercase text-[#cacfd8]">PREVIEW</span>
      </div>
      <div className="h-[480px] overflow-hidden rounded-lg border border-[#e1e4ea] bg-white shadow-[0_2px_6px_rgba(0,0,0,0.08),0_4px_26px_rgba(0,0,0,0.04)]">
        {/* Header */}
        <div className="flex items-center justify-between bg-[#fbfbfb] px-4 pb-2 pt-3">
          <div className="flex items-center gap-0.5">
            <span className="text-base font-medium tracking-tight text-[#0e121b]">Inbox</span>
            <ChevronDown className="size-5 text-[#0e121b]" />
          </div>
          <div className="flex items-center gap-3">
            <MoreHorizontal className="size-5 text-[#99a0ae]" />
            <Settings className="size-5 text-[#99a0ae]" />
          </div>
        </div>
        {/* Tabs */}
        <div className="flex gap-6 border-b border-[#e1e4ea] bg-[#fbfbfb] px-4 py-2">
          <div className="relative flex items-center gap-1">
            <span className="text-sm font-medium tracking-tight text-[#0e121b]">All</span>
            <span className="flex size-4 items-center justify-center rounded-full bg-[#fb3748] text-[11px] font-medium text-white">
              1
            </span>
            <div className="absolute -bottom-2 left-0 right-0 h-0.5 rounded-full bg-[#0e121b]" />
          </div>
          <span className="text-sm font-medium tracking-tight text-[#646464]">Alerts</span>
          <span className="text-sm font-medium tracking-tight text-[#646464]">Updates</span>
        </div>
        {/* Notification */}
        <div className="flex gap-3 bg-[rgba(120,77,239,0.02)] p-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f2f5f8]">
            <span className="text-base">🎉</span>
          </div>
          <div className="flex flex-1 flex-col gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-start justify-between">
                <span className="text-sm font-medium tracking-tight text-[#0e121b]">Looks good, doesn't it?</span>
                <div className="flex items-center px-1.5">
                  <div className="size-1.5 rounded-full bg-[#7d52f4]" />
                </div>
              </div>
              <p className="text-xs font-medium leading-4 text-[#646464] opacity-90">
                See how your app's notifications will look and behave. Next: add Inbox to your UI in just a few lines.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="rounded-md px-3 py-1 text-xs font-medium text-white"
                style={{
                  backgroundImage:
                    'linear-gradient(180deg, rgba(255,255,255,0.16) 20%, rgba(255,255,255,0) 100%), linear-gradient(90deg, #7d52f4, #7d52f4)',
                  boxShadow: '0 0 0 0.5px #7d52f4',
                }}
              >
                {'Implement <Inbox />'}
              </span>
              <span
                className="rounded-md border border-[#e1e4ea] bg-white px-3 py-1 text-xs font-medium text-[#646464]"
                style={{ boxShadow: '0 0 0 0.5px #e1e4ea' }}
              >
                Read docs
              </span>
            </div>
            <span className="text-xs text-[#646464] opacity-50">Today at 9:42 AM</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChannelPill({
  children,
  color,
  icon,
  rotate = 0,
}: {
  children: React.ReactNode;
  color: string;
  icon: React.ReactNode;
  rotate?: number;
}) {
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 align-middle text-xs font-medium"
      style={{
        backgroundColor: `${color}10`,
        border: `1px solid ${color}10`,
        color: `${color}99`,
        transform: rotate ? `rotate(${rotate}deg)` : undefined,
      }}
    >
      <span className="flex size-4 items-center justify-center drop-shadow-[0_1px_1px_rgba(10,13,20,0.03)]">
        {icon}
      </span>
      {children}
    </span>
  );
}

function InboxFeatureList() {
  return (
    <div className="flex flex-col gap-1 px-4 text-xs font-medium text-[#525866]">
      <div className="flex min-h-6 items-center gap-1.5">
        <RiCheckLine className="size-3 shrink-0 text-[#b0b8c4]" />
        <span className="flex flex-wrap items-center gap-1">
          Ship notifications across
          <ChannelPill color="#335cff" icon={<Mail className="size-3" />} rotate={-1}>
            Email
          </ChannelPill>
          <ChannelPill color="#47c2ff" icon={<Smartphone className="size-3" />} rotate={1}>
            Push
          </ChannelPill>
          <ChannelPill color="#7d52f4" icon={<MessageCircle className="size-3" />} rotate={-1}>
            Chat
          </ChannelPill>
          <ChannelPill color="#22d3bb" icon={<Notification5Fill className="size-3" />} rotate={1}>
            In app
          </ChannelPill>
          with one API
        </span>
      </div>
      <div className="flex min-h-6 items-center gap-1.5">
        <RiCheckLine className="size-3 shrink-0 text-[#b0b8c4]" />
        <span>Orchestrate delivery with workflows (conditions, delays, digests, fallbacks)</span>
      </div>
      <div className="flex min-h-6 items-center gap-1.5">
        <RiCheckLine className="size-3 shrink-0 text-[#b0b8c4]" />
        <span className="flex flex-wrap items-center gap-1">
          Setup agents for conversations across
          <span className="inline-flex items-center gap-0.5 rounded border border-[#f2f5f8] bg-[#fbfbfb] px-1 py-0.5 align-middle text-xs font-medium text-[#0e121b]">
            <img src="/images/providers/light/square/slack.svg" alt="" className="size-4" />
            <span>Slack</span>
          </span>
          <span className="inline-flex items-center gap-0.5 rounded border border-[#f2f5f8] bg-[#fbfbfb] px-1 py-0.5 align-middle text-xs font-medium text-[#0e121b]">
            <img src="/images/providers/light/square/whatsapp-business.svg" alt="" className="size-4" />
            <span>Whatsapp</span>
          </span>
          and a lot more
        </span>
      </div>
      <div className="flex min-h-6 items-center gap-1.5">
        <RiCheckLine className="size-3 shrink-0 text-[#b0b8c4]" />
        <span className="flex flex-wrap items-center gap-1">
          Embed the powerful
          <span className="inline-flex items-center gap-0.5 rounded border border-[#f2f5f8] bg-[#fbfbfb] px-1 py-0.5 align-middle text-xs font-medium text-[#0e121b]">
            <LogoCircle className="size-4 p-0.5" />
            {'<Inbox />'}
          </span>
          with built-in preferences and notification history
        </span>
      </div>
    </div>
  );
}

const USECASE_OPTIONS = [
  {
    id: 'agents' as const,
    title: 'Set up agents wherever your users are',
    description:
      'Agent communication infrastructure for your users. Connect your agents to Slack, Teams, WhatsApp and more.',
  },
  {
    id: 'inbox' as const,
    title: 'Implement notifications for your platform',
    description:
      "Notification infrastructure for your product's users. Embed <Inbox /> and send transactional notifications with workflows.",
  },
] as const;

type UsecaseId = 'agents' | 'inbox';

function UsecaseTag({ id }: { id: UsecaseId }) {
  if (id === 'agents') {
    return (
      <span
        className="inline-flex w-fit items-center gap-0.5 self-start rounded border py-0.5 pl-[3px] pr-[5px] font-mono text-xs font-medium uppercase tracking-tight text-[#7d52f4]"
        style={{ backgroundColor: 'rgba(125,82,244,0.1)', borderColor: 'rgba(125,82,244,0.05)' }}
      >
        <Bot className="size-4" strokeWidth={1.5} />
        Conversations
      </span>
    );
  }

  return (
    <span
      className="inline-flex w-fit items-center gap-0.5 self-start rounded border py-0.5 pl-[3px] pr-[5px] font-mono text-xs font-medium uppercase tracking-tight"
      style={{ backgroundColor: 'rgba(251,55,72,0.1)', borderColor: 'rgba(251,55,72,0.05)' }}
    >
      <Notification5Fill className="size-3.5 p-px text-[#dd2450]" />
      <span className="bg-linear-to-br from-[#dd2450] to-[#ff512f] bg-clip-text text-transparent">Notifications</span>
    </span>
  );
}

function UsecaseSelector({ selected, onSelect }: { selected: UsecaseId; onSelect: (id: UsecaseId) => void }) {
  const navigate = useNavigate();
  const telemetry = useTelemetry();
  const updateProductUseCases = useUpdateProductUseCases();

  const handleContinue = () => {
    telemetry(TelemetryEvent.USECASE_SELECTED, { usecase: selected });

    if (selected === 'inbox') {
      // Persist the picked usecase on the org (fire-and-forget — navigation continues regardless).
      updateProductUseCases.mutate({ [ProductUseCasesEnum.IN_APP]: true });
      // Restart the provisioning loader so it plays a full cycle (with the inbox/notification copy)
      // while the destination page boots, instead of flickering off as soon as data resolves.
      beginOnboardingProvisioning('platform');
      void navigate(ROUTES.INBOX_USECASE);

      return;
    }

    if (selected === 'agents') {
      updateProductUseCases.mutate({ [ProductUseCasesEnum.AGENTS]: true });
      beginOnboardingProvisioning('agents');
      void navigate(ROUTES.AGENTS_SETUP);
    }
  };

  return (
    <div className="mt-6">
      <div className="flex max-w-[400px] flex-col gap-4">
        {USECASE_OPTIONS.map((option) => {
          const isSelected = selected === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              className="cursor-pointer rounded-[9px] p-0.5 text-left"
            >
              <div
                className="relative overflow-hidden rounded-lg border border-[#e1e4ea] p-3 transition-all duration-200 hover:border-[#cdd1d8]"
                style={{
                  backgroundImage:
                    'linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.02) 100%), linear-gradient(90deg, #fff 0%, #fff 100%)',
                  boxShadow: isSelected
                    ? '0 1px 2px 0 rgba(16,24,40,0.05), 0 0 0 4px #f2f4f7, 0 0 2px 0 #e0e0e0, 0 1px 4px -2px rgba(24,39,75,0.02), 0 4px 4px -2px rgba(24,39,75,0.06)'
                    : '0 1px 2px 0 rgba(16,24,40,0.05)',
                }}
              >
                <div className="absolute right-[11px] top-[11px] size-5">
                  {isSelected ? (
                    <>
                      <div className="bg-primary-base absolute inset-[10%] rounded-full" />
                      <div className="absolute inset-[30%] rounded-full bg-white" />
                    </>
                  ) : (
                    <>
                      <div className="absolute inset-[10%] rounded-full bg-[#e1e4ea]" />
                      <div className="absolute inset-[17.5%] rounded-full bg-white shadow-[0px_2px_2px_0px_rgba(27,28,29,0.12)]" />
                    </>
                  )}
                </div>
                <div className="flex flex-col gap-4">
                  <UsecaseTag id={option.id} />
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-text-strong text-base font-medium tracking-tight">{option.title}</h3>
                    <p className="text-text-soft text-xs font-normal leading-4">{option.description}</p>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleContinue}
        className="mt-8 inline-flex items-center gap-1 rounded-lg border border-white/[0.12] px-2.5 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
        style={{
          backgroundImage:
            'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 100%), linear-gradient(90deg, #0e121b 0%, #0e121b 100%)',
          boxShadow: '0 1px 2px 0 rgba(27,28,29,0.48), 0 0 0 1px #242628',
        }}
      >
        Continue setup
        <ChevronRight className="size-4" />
      </button>

      <div className="text-text-sub mt-4 flex items-center gap-2 text-xs">
        <span>Have questions?</span>
        <a
          href={BOOK_DEMO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-strong inline-flex items-center gap-1 text-xs font-medium hover:underline"
        >
          <CalendarDays className="size-4" />
          Book a demo
        </a>
      </div>
    </div>
  );
}

export function UsecaseSelectPage() {
  const isAgentsEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CONVERSATIONAL_AGENTS_ENABLED, false);
  const telemetry = useTelemetry();
  const [selected, setSelected] = useState<UsecaseId>('agents');
  const provisioningActive = useOnboardingProvisioningActive();

  useOnboardingProvisioningDismiss({
    isReady: true,
    fallbackVariant: 'platform',
  });

  useEffect(() => {
    telemetry(TelemetryEvent.USECASE_SELECT_PAGE_VIEWED);
  }, [telemetry]);

  if (provisioningActive) {
    return null;
  }

  // Agents are hard-disabled in the EU region; skip the usecase picker entirely there.
  if (IS_EU || !isAgentsEnabled) {
    return <Navigate to={ROUTES.INBOX_USECASE} replace />;
  }

  const leftContent = (
    <>
      <PageMeta title="Get started with Novu" />
      <div className="mb-5 flex items-center gap-0.5">
        <RiArrowLeftSLine className="text-text-sub size-4" />
        <span className="text-text-sub text-xs">1/2</span>
      </div>
      <h1 className="text-foreground text-xl font-normal text-label-lg">Get started with Novu</h1>
      <p className="text-text-soft text-label-xs font-normal mt-2">
        Pick what you would like to start with, you can always set up the other path anytime.
      </p>
      <UsecaseSelector selected={selected} onSelect={setSelected} />
    </>
  );

  const rightContent = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={selected}
        className="flex flex-col items-start"
        initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      >
        {selected === 'agents' ? (
          <>
            <div className="self-center">
              <AgentUsecasePreviewIllustration />
            </div>
            <div className="mt-10">
              <FeatureList />
            </div>
          </>
        ) : (
          <>
            <div className="self-center">
              <InboxPreview />
            </div>
            <div className="mt-10">
              <InboxFeatureList />
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );

  return <OnboardingShell left={leftContent} right={rightContent} />;
}
