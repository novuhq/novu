import { FeatureFlagsKeysEnum } from '@novu/shared';
import { CalendarDays, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { RiArrowLeftSLine, RiArrowRightSLine } from 'react-icons/ri';
import { Navigate, useNavigate } from 'react-router-dom';
import { SetupStep } from '@/components/agents/setup-guide-primitives';
import type { StepStatus } from '@/components/agents/setup-guide-step-utils';
import { BOOK_DEMO_URL } from '@/components/header-navigation/support-drawer-constants';
import { AgentFlowIllustration } from '@/components/onboarding/agent-flow-illustration';
import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { PageMeta } from '@/components/page-meta';
import { Button } from '@/components/primitives/button';
import { InlineToast } from '@/components/primitives/inline-toast';
import {
  SegmentedControl,
  SegmentedControlList,
  SegmentedControlTrigger,
} from '@/components/primitives/segmented-control';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useTelemetry } from '@/hooks/use-telemetry';
import { ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';

const CHANNELS = [
  {
    id: 'slack',
    label: 'Slack',
    icon: '/images/providers/light/square/slack.svg',
  },
  {
    id: 'email',
    label: 'Email',
    lucideIcon: Mail,
  },
  {
    id: 'whatsapp',
    label: 'Whatsapp',
    icon: '/images/providers/light/square/whatsapp-business.svg',
  },
] as const;

type ChannelId = (typeof CHANNELS)[number]['id'];

interface StepDef {
  title: string;
  description: string;
  note?: string;
}

const STEPS_BY_CHANNEL: Record<ChannelId, StepDef[]> = {
  slack: [
    {
      title: 'Install in your workspace',
      description:
        'This is what your users need to do to install the slack app to their workspace to start interacting with it.',
    },
    {
      title: 'Say hello in Slack',
      description: 'Tag @Support Agent in any channel and send a message.',
      note: "This is Novu's demo Slack app. You'll swap it for your own provider integrations later, after your agent is integrated.",
    },
  ],
  email: [
    {
      title: 'Configure email provider',
      description: 'Set up your email integration to enable agent conversations over email.',
    },
    {
      title: 'Send a test email',
      description: 'Send a message to verify your email configuration is working.',
    },
  ],
  whatsapp: [
    {
      title: 'Connect WhatsApp Business',
      description: 'Link your WhatsApp Business account to start receiving messages.',
    },
    {
      title: 'Send a test message',
      description: 'Send a WhatsApp message to verify the connection.',
    },
  ],
};

function InstallButton({ channel }: { channel: ChannelId }) {
  if (channel !== 'slack') {
    return null;
  }

  return (
    <button
      type="button"
      className="inline-flex cursor-pointer items-center gap-0.5 rounded-md px-2 py-1.5"
      style={{
        backgroundImage:
          'linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.02) 100%), linear-gradient(90deg, #fff 0%, #fff 100%)',
        boxShadow: '0 0 0 1px #e1e4ea, 0 1px 3px 0 rgba(14,18,27,0.12)',
      }}
    >
      <img src="/images/providers/light/square/slack.svg" alt="" className="size-4" />
      <span className="text-text-sub px-1 text-label-xs font-medium">Install Support agent</span>
      <span className="rounded-full bg-warning-lighter px-1.5 py-[3.5px] text-[11px] font-medium uppercase leading-3 tracking-wide text-warning-base">
        demo
      </span>
    </button>
  );
}

function ListeningIndicator() {
  return (
    <div className="flex items-center gap-1 py-4 pl-8">
      <div className="flex items-center gap-1">
        <span className="size-3.5 text-[#dd2476] animate-[spin_5s_linear_infinite]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </span>
        <span className="animate-gradient bg-linear-to-r from-[#dd2476] via-[#ff512f] to-[#dd2476] bg-size-[400%_400%] bg-clip-text text-label-sm font-medium text-transparent">
          Listening for a message...
        </span>
      </div>
    </div>
  );
}

function getStepStatus(index: number): StepStatus {
  if (index === 0) return 'completed';
  if (index === 1) return 'current';

  return 'upcoming';
}

export function AgentsUsecasePage() {
  const isAgentsEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CONVERSATIONAL_AGENTS_ENABLED, false);
  const navigate = useNavigate();
  const telemetry = useTelemetry();
  const [activeChannel, setActiveChannel] = useState<ChannelId>('slack');

  useEffect(() => {
    telemetry(TelemetryEvent.AGENTS_USECASE_PAGE_VIEWED);
  }, [telemetry]);

  if (!isAgentsEnabled) {
    return <Navigate to={ROUTES.INBOX_USECASE} replace />;
  }

  const steps = STEPS_BY_CHANNEL[activeChannel];

  const leftContent = (
    <>
      <PageMeta title="Experience a demo agent from Novu" />
      <button
        type="button"
        onClick={() => navigate(ROUTES.USECASE_SELECT)}
        className="mb-5 flex cursor-pointer items-center gap-0.5"
      >
        <RiArrowLeftSLine className="text-text-sub size-4" />
        <span className="text-text-sub text-xs">2/3</span>
      </button>

      <h1 className="text-foreground text-xl font-semibold">Experience a demo agent from Novu.</h1>
      <p className="text-text-sub mt-2 text-xs font-medium leading-4">
        You&apos;re just a couple steps away from giving your agents the unified voice.
      </p>

      <div className="relative mt-6">
        <div
          className="absolute left-[22px] top-0 w-px"
          style={{
            height: 'calc(100% + 40px)',
            background: 'linear-gradient(to bottom, #e4e7ec 0%, #e4e7ec 80%, transparent 100%)',
          }}
        />
        <div className="relative z-10 flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2.5">
          <span className="text-text-sub text-xs font-medium">Experience the agent across multiple channels</span>
          <SegmentedControl value={activeChannel} onValueChange={(v) => setActiveChannel(v as ChannelId)}>
            <SegmentedControlList className="w-auto">
              {CHANNELS.map((channel) => (
                <SegmentedControlTrigger key={channel.id} value={channel.id} className="gap-1.5 px-2 text-xs">
                  {'icon' in channel ? (
                    <img src={channel.icon} alt="" className="size-4" />
                  ) : (
                    <channel.lucideIcon className="text-text-soft size-4" strokeWidth={1.5} />
                  )}
                  {channel.label}
                </SegmentedControlTrigger>
              ))}
            </SegmentedControlList>
          </SegmentedControl>
        </div>

        <div className="mt-8 flex flex-col gap-14 pl-8">
          {steps.map((step, index) => {
            const status = getStepStatus(index);

            return (
              <SetupStep
                key={step.title}
                index={index + 1}
                status={status}
                title={step.title}
                description={step.description}
                extraContent={
                  step.note ? (
                    <InlineToast className="mt-3" variant="tip" title="Note:" description={step.note} />
                  ) : undefined
                }
                rightContent={
                  <>
                    {status === 'completed' && <InstallButton channel={activeChannel} />}
                    {status === 'current' && <ListeningIndicator />}
                  </>
                }
              />
            );
          })}
        </div>
      </div>

      <div className="mt-10 flex items-center gap-3">
        <Button variant="secondary" mode="gradient" size="xs" trailingIcon={RiArrowRightSLine}>
          Setup agent
        </Button>

        <Button variant="secondary" mode="ghost" size="xs" onClick={() => navigate(ROUTES.WORKFLOWS)}>
          Skip to dashboard
        </Button>
      </div>

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
    </>
  );

  const rightContent = <AgentFlowIllustration state="connect" runtime="scratch" />;

  return <OnboardingShell left={leftContent} right={rightContent} maxLeftWidth="820px" />;
}
