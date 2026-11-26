import type { CopilotStepEventData, CopilotWorkflowStepChange } from '@novu/shared';
import { type ReactNode, useState } from 'react';
import {
  RiArrowDownSFill,
  RiArrowDownSLine,
  RiArrowRightSFill,
  RiArrowRightSLine,
  RiCheckLine,
  RiCloseLine,
  RiLoader4Line,
} from 'react-icons/ri';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { cn } from '@/utils/ui';
import { CopilotChangeRow } from './copilot-change-row';
import { getThoughtSeconds } from './copilot-steps';

type ChecklistItem =
  | { kind: 'step'; key: string; step: CopilotStepEventData }
  | { kind: 'change'; key: string; change: CopilotWorkflowStepChange }
  | { kind: 'active'; key: string; label: string };

function buildItems(steps: readonly CopilotStepEventData[], activeLabel: string | undefined): ChecklistItem[] {
  const items = steps.flatMap((step): ChecklistItem[] => [
    { kind: 'step', key: step.id, step },
    ...(step.change ? [{ kind: 'change' as const, key: `${step.id}:change`, change: step.change }] : []),
  ]);

  return activeLabel === undefined ? items : [...items, { kind: 'active', key: 'active', label: activeLabel }];
}

/** The 16px column on the left: a step's status dot, and the line that runs down to the next row. */
function Rail({ dot, hasLine }: { dot?: ReactNode; hasLine: boolean }) {
  return (
    <span aria-hidden className="flex w-4 shrink-0 flex-col items-center gap-px self-stretch pt-0.5">
      {dot && <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-bg-weak">{dot}</span>}
      <span className={cn('w-px flex-1 bg-stroke-soft', !hasLine && 'invisible')} />
    </span>
  );
}

function StepRow({ step, hasLine }: { step: CopilotStepEventData; hasLine: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const Chevron = isOpen ? RiArrowDownSLine : RiArrowRightSLine;
  const dot = step.isError ? (
    <RiCloseLine className="size-2.5 text-error-base" />
  ) : (
    <RiCheckLine className="size-2.5 text-text-soft" />
  );
  const label = (
    <span className="min-w-0 truncate text-label-xs text-text-soft group-hover:text-text-sub">{step.label}</span>
  );

  return (
    <li className="flex gap-2">
      <Rail dot={dot} hasLine={hasLine} />
      <div className="flex min-w-0 flex-1 flex-col gap-1 pb-2 pt-0.5">
        {step.detail ? (
          <button
            type="button"
            onClick={() => setIsOpen((value) => !value)}
            aria-expanded={isOpen}
            className="group flex w-fit min-w-0 max-w-full items-center gap-1 text-left"
          >
            {label}
            <Chevron className="size-3.5 shrink-0 text-text-soft" />
          </button>
        ) : (
          label
        )}
        {isOpen && step.detail && <p className="whitespace-pre-wrap text-xs leading-4 text-text-soft">{step.detail}</p>}
      </div>
    </li>
  );
}

function ChecklistRow({ item, hasLine }: { item: ChecklistItem; hasLine: boolean }) {
  switch (item.kind) {
    case 'step':
      return <StepRow step={item.step} hasLine={hasLine} />;
    case 'change':
      return (
        <li className="flex gap-2 pb-2">
          <Rail hasLine={hasLine} />
          <div className="min-w-0 flex-1">
            <CopilotChangeRow change={item.change} variant="standalone" />
          </div>
        </li>
      );
    case 'active':
      return (
        <li className="flex gap-2">
          <Rail dot={<RiLoader4Line className="size-2.5 animate-spin text-text-sub" />} hasLine={false} />
          <div className="min-w-0 flex-1 pb-2 pt-0.5">
            <Shimmer key={item.label} as="span" className="text-label-xs">
              {item.label}
            </Shimmer>
          </div>
        </li>
      );
    default: {
      const unhandled: never = item;

      return unhandled;
    }
  }
}

function Checklist({ items }: { items: ChecklistItem[] }) {
  return (
    <ul className="flex flex-col">
      {items.map((item, index) => (
        <ChecklistRow key={item.key} item={item} hasLine={index < items.length - 1} />
      ))}
    </ul>
  );
}

/**
 * What a turn did, from the `copilot.step` events of its replies: open while the Copilot works, with the step it is
 * on (`activeLabel`) last, then folded into "Thought for Xs" once the turn is done.
 */
export function CopilotTurnSteps({
  steps,
  activeLabel,
}: {
  steps: readonly CopilotStepEventData[];
  activeLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const items = buildItems(steps, activeLabel);

  if (activeLabel !== undefined) {
    return (
      <output aria-label="Copilot progress" className="flex flex-col">
        <Checklist items={items} />
      </output>
    );
  }

  if (steps.length === 0) return null;

  const seconds = getThoughtSeconds(steps);
  const Triangle = isOpen ? RiArrowDownSFill : RiArrowRightSFill;

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
        className="flex w-fit items-center gap-1.5 pb-2 text-label-xs text-text-strong hover:text-text-sub"
      >
        <Triangle className="size-[15px] text-text-soft" />
        {`Thought for ${seconds}s`}
      </button>
      {isOpen && <Checklist items={items} />}
    </div>
  );
}
