import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { RiArrowRightSLine, RiBookMarkedLine, RiCheckLine } from 'react-icons/ri';
import { cn } from '@/utils/ui';
import { Button } from '../../primitives/button';

export type WelcomeStepStatus = 'completed' | 'pending';

export type WelcomeSetupStep = {
  id: string;
  title: ReactNode;
  description: ReactNode;
  status: WelcomeStepStatus;
  ctaLabel?: string;
  ctaTrailingIcon?: IconType;
  ctaDisabled?: boolean;
  onCtaClick?: () => void;
};

function StepIndicator({ status, index }: { status: WelcomeStepStatus; index: number }) {
  if (status === 'completed') {
    return (
      <div className="relative z-10 flex size-6 items-center justify-center rounded-full border-2 border-[#E1E4EA]">
        <div className="m-px flex size-[18px] min-w-[18px] items-center justify-center rounded-full border-[#5EC269] bg-[#77DB89] p-1 text-static-white">
          <RiCheckLine className="h-full min-w-full" aria-hidden />
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 flex size-6 items-center justify-center rounded-full border-2 border-[#E1E4EA]">
      <div className="text-text-strong text-label-xs bg-bg-muted m-px flex size-[22px] items-center justify-center rounded-full">
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
  step: WelcomeSetupStep;
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
          <p className="text-text-soft text-paragraph-xs mt-1 leading-4">{step.description}</p>
        </div>

        {!isCompleted && step.ctaLabel ? (
          <div className="ml-2 flex shrink-0 flex-col items-start gap-1.5 pt-0.5 lg:ml-10">
            <Button
              variant="secondary"
              mode="outline"
              size="2xs"
              trailingIcon={TrailingIcon}
              onClick={step.onCtaClick}
              disabled={step.ctaDisabled}
            >
              {step.ctaLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </li>
  );
}

type SetupStepsCardProps = {
  steps: WelcomeSetupStep[];
  onLearnMore: () => void;
};

export function SetupStepsCard({ steps, onLearnMore }: SetupStepsCardProps) {
  return (
    <div className="bg-bg-weak flex flex-col rounded-[10px] p-1">
      <div className="flex items-center justify-between px-2 py-1.5">
        <span className="text-text-soft text-code-xs font-code font-medium uppercase leading-4 tracking-wider">
          Set things up
        </span>
        <button
          type="button"
          onClick={onLearnMore}
          className="text-text-sub hover:text-text-strong text-paragraph-xs cursor-pointer transition-colors"
        >
          How it works?
        </button>
      </div>

      <div className="bg-bg-white rounded-md p-5 shadow-[0px_0px_0px_1px_rgba(25,28,33,0.04),0px_1px_2px_0px_rgba(25,28,33,0.06),0px_0px_2px_0px_rgba(0,0,0,0.08)]">
        <ol className="flex flex-col">
          {steps.map((step, idx) => (
            <StepRow key={step.id} step={step} index={idx + 1} isFirst={idx === 0} isLast={idx === steps.length - 1} />
          ))}
        </ol>

        <div className="mt-3 flex items-center gap-2">
          <RiBookMarkedLine className="text-text-sub size-3.5 shrink-0" aria-hidden />
          <button
            type="button"
            onClick={onLearnMore}
            className="text-text-sub hover:text-text-strong text-paragraph-xs cursor-pointer underline underline-offset-2 transition-colors"
          >
            Learn more in docs
          </button>
        </div>
      </div>
    </div>
  );
}
