import { RiArrowRightSLine, RiCheckLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/primitives/button';
import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { type DispatchSetupStep, type DispatchSetupStepId, useDispatchSetupSteps } from './use-dispatch-setup-steps';

type StepRowProps = {
  step: DispatchSetupStep;
  index: number;
  onCta?: () => void;
  ctaLabel?: string;
};

const CTA_LABEL_BY_STEP: Partial<Record<DispatchSetupStepId, string>> = {
  'add-agent': 'Add agent',
  'setup-channel': 'Setup channel',
};

function StepRow({ step, index, onCta, ctaLabel }: StepRowProps) {
  const isCompleted = step.status === 'completed';

  return (
    <li
      className={cn(
        'border-stroke-soft bg-bg-white flex items-center gap-3 rounded-md border px-3 py-2.5 shadow-xs',
        isCompleted && 'opacity-60'
      )}
    >
      <span
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-full text-label-xs font-medium',
          isCompleted ? 'bg-success-base text-white' : 'border-stroke-soft text-text-soft border bg-bg-white'
        )}
        aria-hidden
      >
        {isCompleted ? <RiCheckLine className="size-3.5" /> : index + 1}
      </span>

      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            'text-text-strong text-label-sm font-medium leading-5',
            isCompleted && 'text-text-soft line-through'
          )}
        >
          {step.title}
        </span>
        <span className="text-text-soft text-label-xs leading-4">{step.description}</span>
      </div>

      {step.ctaAvailable && onCta && ctaLabel ? (
        <Button
          variant="secondary"
          mode="gradient"
          size="xs"
          trailingIcon={RiArrowRightSLine}
          onClick={onCta}
          type="button"
        >
          {ctaLabel}
        </Button>
      ) : null}
    </li>
  );
}

export function SetThingsUpSection() {
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();
  const { steps, isComplete } = useDispatchSetupSteps();

  if (isComplete) {
    return null;
  }

  const environmentSlug = currentEnvironment?.slug ?? '';

  const handleStepCta = (step: DispatchSetupStep) => {
    if (!environmentSlug) return;

    if (step.id === 'add-agent') {
      navigate(`${buildRoute(ROUTES.DISPATCH_AGENTS, { environmentSlug })}?create=1`);

      return;
    }

    if (step.id === 'setup-channel' && step.agentIdentifier) {
      navigate(
        buildRoute(ROUTES.DISPATCH_AGENT_DETAILS_TAB, {
          environmentSlug,
          agentIdentifier: encodeURIComponent(step.agentIdentifier),
          agentTab: 'integrations',
        })
      );
    }
  };

  return (
    <div className="bg-bg-weak flex flex-col rounded-[10px] p-1">
      <div className="flex items-center px-2 py-1.5">
        <span className="text-text-soft font-code text-[11px] font-medium uppercase leading-4 tracking-wider">
          Set things up
        </span>
      </div>
      <ol className="flex flex-col gap-1.5 p-1">
        {steps.map((step, index) => (
          <StepRow
            key={step.id}
            step={step}
            index={index}
            ctaLabel={CTA_LABEL_BY_STEP[step.id]}
            onCta={() => handleStepCta(step)}
          />
        ))}
      </ol>
    </div>
  );
}
