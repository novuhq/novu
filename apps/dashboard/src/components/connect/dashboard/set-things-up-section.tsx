import type { ReactNode } from 'react';
import { RiAddLine, RiArrowRightSLine, RiBookMarkedLine, RiCheckLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { docsUrl } from '@/components/header-navigation/support-drawer-constants';
import { Button } from '@/components/primitives/button';
import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { useConnectSetupSteps } from './use-connect-setup-steps';

type DisplayStep = {
  id: string;
  title: string;
  description: ReactNode;
  status: 'completed' | 'pending';
  ctaLabel?: string;
  ctaIcon?: ReactNode;
  ctaTrailingIcon?: typeof RiArrowRightSLine;
  ctaDisabled?: boolean;
  onCtaClick?: () => void;
  subLink?: { label: string; onClick: () => void };
};

function StepIndicator({ status, index }: { status: 'completed' | 'pending'; index: number }) {
  if (status === 'completed') {
    return (
      <div className="relative z-10 flex items-center justify-center rounded-full border-[#E1E4EA] border-2 size-6">
        <div className="min-w-4.5 w-4.5 h-4.5 text-static-white border-[#5EC269] bg-[#77DB89] flex items-center justify-center rounded-full m-px p-1">
          <RiCheckLine className="min-w-full h-full" aria-hidden />
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 flex items-center justify-center rounded-full border-[#E1E4EA] border-2 size-6">
      <div className="min-w-4.5 w-4.5 h-4.5 text-text-strong text-label-xs bg-bg-muted flex items-center justify-center rounded-full m-px size-5.5">
        {index}
      </div>
    </div>
  );
}

function StepRow({
  step,
  index,
  isFirst,
  isLast,
}: {
  step: DisplayStep;
  index: number;
  isFirst: boolean;
  isLast: boolean;
}) {
  const isCompleted = step.status === 'completed';
  const TrailingIcon = step.ctaTrailingIcon ?? RiArrowRightSLine;

  return (
    <li className="flex items-stretch gap-4">
      <div className="flex w-5 shrink-0 flex-col items-center self-stretch">
        <div className={cn('h-2 w-px', isFirst ? 'bg-transparent' : 'bg-stroke-soft')} />
        <StepIndicator status={step.status} index={index} />
        <div className={cn('w-px flex-1', isLast ? 'bg-transparent' : 'bg-stroke-soft')} />
      </div>

      <div className="flex min-w-0 flex-1 items-start gap-4 py-2.5">
        <div className="flex min-w-0 max-w-88 flex-col gap-0.5">
          <h3
            className={cn('text-label-sm leading-5', isCompleted ? 'text-text-soft line-through' : 'text-text-strong')}
          >
            {step.title}
          </h3>
          <p className="text-text-soft text-paragraph-xs leading-4 mt-1">{step.description}</p>
        </div>

        {!isCompleted && step.ctaLabel ? (
          <div className="ml-2 flex-1 lg:ml-10 flex shrink-0 flex-col items-start gap-1.5 pt-0.5">
            <Button
              variant="secondary"
              mode="outline"
              size="2xs"
              trailingIcon={TrailingIcon}
              onClick={step.onCtaClick}
              disabled={step.ctaDisabled}
            >
              {step.ctaIcon}
              {step.ctaLabel}
            </Button>

            {step.subLink ? (
              <button
                type="button"
                onClick={step.subLink.onClick}
                className="cursor-pointer text-text-soft hover:text-text-strong text-paragraph-xs flex items-center gap-0.5 transition-colors"
              >
                {step.subLink.label}
                <RiArrowRightSLine className="size-3.5" aria-hidden />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}

export function SetThingsUpSection() {
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();
  const { steps: hookSteps, shouldShowOnboarding, isLoading } = useConnectSetupSteps();

  if (!shouldShowOnboarding) {
    return null;
  }

  const environmentSlug = currentEnvironment?.slug ?? '';
  const stepById = new Map(hookSteps.map((s) => [s.id, s]));
  const createAccount = stepById.get('create-account');
  const addAgent = stepById.get('add-agent');
  const setupChannel = stepById.get('setup-channel');
  const sendMessage = stepById.get('send-first-message');

  const goToAddAgent = () => {
    if (!environmentSlug) return;

    navigate(`${buildRoute(ROUTES.CONNECT_AGENTS, { environmentSlug })}?create=1`);
  };

  const goToSetupChannel = () => {
    if (!environmentSlug || !setupChannel?.agentIdentifier) return;

    navigate(
      buildRoute(ROUTES.CONNECT_AGENT_DETAILS_TAB, {
        environmentSlug,
        agentIdentifier: encodeURIComponent(setupChannel.agentIdentifier),
        agentTab: 'integrations',
      })
    );
  };

  const handleHowItWorks = () => {
    window.open(docsUrl('/platform/connect/overview'), '_blank', 'noopener,noreferrer');
  };

  const displaySteps: DisplayStep[] = [
    {
      id: 'create-account',
      title: 'Account creation',
      description: "We know it's not always easy — take a moment to celebrate!",
      status: createAccount?.status ?? 'completed',
    },
    {
      id: 'add-agent',
      title: 'Add an agent',
      description: (
        <>
          Give it a name, a system prompt, and pick the tools it can use.{' '}
          <button
            type="button"
            onClick={handleHowItWorks}
            className="cursor-pointer text-text-soft hover:text-text-strong underline underline-offset-2 transition-colors"
          >
            View setup guide
          </button>
          .
        </>
      ),
      status: isLoading ? 'pending' : (addAgent?.status ?? 'pending'),
      ctaLabel: 'Add an agent',
      ctaTrailingIcon: RiAddLine,
      onCtaClick: goToAddAgent,
      ctaDisabled: isLoading,
    },
    {
      id: 'setup-channel',
      title: 'Connect a channel',
      description: 'Slack, Teams, WhatsApp, or Email. Pick where your agent lives. You can add more channels later.',
      status: isLoading ? 'pending' : (setupChannel?.status ?? 'pending'),
      ctaLabel: setupChannel?.ctaAvailable ? 'Setup agent' : undefined,
      onCtaClick: goToSetupChannel,
      ctaDisabled: isLoading,
    },
    {
      id: 'send-first-message',
      title: 'Send your first message.',
      description: 'Open the channel, DM your agent, watch it reply. This is the moment.',
      status: isLoading ? 'pending' : (sendMessage?.status ?? 'pending'),
    },
  ];

  return (
    <div className="bg-bg-weak flex flex-col rounded-[10px] p-1">
      <div className="flex items-center justify-between px-2 py-1.5">
        <span className="text-text-soft text-code-xs font-code font-medium uppercase leading-4 tracking-wider">
          Set things up
        </span>
        <button
          type="button"
          onClick={handleHowItWorks}
          className="text-text-sub hover:text-text-strong text-paragraph-xs transition-colors cursor-pointer"
        >
          How it works?
        </button>
      </div>

      <div className="bg-bg-white rounded-md p-5 shadow-[0px_0px_0px_1px_rgba(25,28,33,0.04),0px_1px_2px_0px_rgba(25,28,33,0.06),0px_0px_2px_0px_rgba(0,0,0,0.08)]">
        <ol className="flex flex-col">
          {displaySteps.map((step, idx) => (
            <StepRow
              key={step.id}
              step={step}
              index={idx + 1}
              isFirst={idx === 0}
              isLast={idx === displaySteps.length - 1}
            />
          ))}
        </ol>

        <div className="mt-3 flex items-center gap-2">
          <RiBookMarkedLine className="text-text-sub size-3.5 shrink-0" aria-hidden />
          <button
            type="button"
            onClick={handleHowItWorks}
            className="text-text-sub cursor-pointer hover:text-text-strong text-paragraph-xs underline underline-offset-2 transition-colors"
          >
            Learn more in docs
          </button>
        </div>
      </div>
    </div>
  );
}
