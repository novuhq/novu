import type { IEnvironment } from '@novu/shared';
import { SquareMinus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { RiArrowDownSLine, RiArrowRightSLine, RiCodeSSlashLine, RiEyeLine } from 'react-icons/ri';
import { StepTypeEnum } from '@/utils/enums';
import { cn } from '@/utils/ui';
import { SegmentedControl, SegmentedControlList, SegmentedControlTrigger } from '../primitives/segmented-control';
import { WorkflowStep } from '../workflow-step';
import { ChangeNote, DiffStat, ResourceStatusBadge } from './change-badges';
import type { ScrollRequest } from './change-cards';
import { removalNote } from './change-notes';
import { type ChangeSectionItem, isStepPreviewable, type StepChange } from './change-sections';
import { EnvironmentHeader, type EnvironmentNames, JsonDiffCompare } from './payload-schema-preview';
import { StepPreviewPane } from './step-change-preview';

export type PublishEnvironments = {
  source: IEnvironment | undefined;
  target: IEnvironment | undefined;
};

function movedStepLabel(step: StepChange): string {
  if (step.previousIndex === undefined || step.newIndex === undefined) return 'Moved';

  return `Moved ${step.previousIndex + 1} → ${step.newIndex + 1}`;
}

type StepView = 'preview' | 'json';

type RegisterNode = (key: string) => (node: HTMLDivElement | null) => void;

const STEP_TYPES = new Set<string>(Object.values(StepTypeEnum));

function toStepType(stepType: string | undefined): StepTypeEnum | null {
  return stepType !== undefined && STEP_TYPES.has(stepType) ? (stepType as StepTypeEnum) : null;
}

export function StepChangeList({
  workflowId,
  items,
  nodeKey,
  registerNode,
  scrollRequest,
  environments,
  environmentNames,
}: {
  workflowId: string;
  items: ChangeSectionItem[];
  nodeKey: string;
  registerNode: RegisterNode;
  scrollRequest: ScrollRequest | null;
  environments: PublishEnvironments;
  environmentNames: EnvironmentNames;
}) {
  return (
    <div className="mt-1 flex min-w-0 flex-col overflow-hidden rounded-lg border border-stroke-soft bg-bg-white">
      {items.map((item, index) => {
        const itemKey = `${nodeKey}:${item.id}`;

        return (
          <StepChangeRow
            key={item.id}
            ref={registerNode(itemKey)}
            item={item}
            workflowId={workflowId}
            environments={environments}
            environmentNames={environmentNames}
            focusNonce={scrollRequest?.key === itemKey ? scrollRequest.nonce : 0}
            className={cn(index > 0 && 'border-t border-stroke-weak')}
          />
        );
      })}
    </div>
  );
}

function StepChangeRow({
  ref,
  item,
  workflowId,
  environments,
  environmentNames,
  focusNonce,
  className,
}: {
  ref: (node: HTMLDivElement | null) => void;
  item: ChangeSectionItem;
  workflowId: string;
  environments: PublishEnvironments;
  environmentNames: EnvironmentNames;
  /** Bumps when the sidebar selects this step, so it opens and stays open. */
  focusNonce: number;
  className?: string;
}) {
  const step = item.step;
  const stepType = toStepType(item.stepType);
  const canExpand = step !== undefined && step.action !== 'moved';
  const canPreview = isStepPreviewable(item.stepType);
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<StepView>(canPreview ? 'preview' : 'json');

  useEffect(() => {
    if (focusNonce && canExpand) setExpanded(true);
  }, [focusNonce, canExpand]);

  const toggle = () => {
    if (canExpand) setExpanded((open) => !open);
  };

  const Chevron = expanded ? RiArrowDownSLine : RiArrowRightSLine;

  return (
    <div ref={ref} className={cn('flex min-w-0 scroll-mt-3 flex-col', className)}>
      <div className="flex min-w-0 items-center gap-2.5 px-3 py-2">
        <button
          type="button"
          onClick={toggle}
          disabled={!canExpand}
          aria-expanded={canExpand ? expanded : undefined}
          className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:cursor-default"
        >
          <span className="flex shrink-0 items-center gap-1">
            {stepType && (
              <WorkflowStep
                step={stepType}
                className="size-6 justify-center rounded border-none bg-bg-weak p-1 shadow-none"
              />
            )}
            <span className="truncate text-label-xs text-text-strong">{item.name}</span>
          </span>
          {step && (
            <span className="truncate font-code text-[10px] italic leading-[15px] tracking-[-0.2px] text-text-disabled">
              {step.stepId}
            </span>
          )}
        </button>

        {expanded && canPreview && (
          <SegmentedControl value={view} onValueChange={(value) => setView(value as StepView)} className="shrink-0">
            <SegmentedControlList
              className="w-auto gap-px rounded-[7px] bg-bg-muted p-px"
              floatingBgClassName="inset-y-px"
            >
              <SegmentedControlTrigger value="preview" className="gap-1.5 px-2 text-label-xs">
                <RiEyeLine className="size-[15px]" />
                Preview
              </SegmentedControlTrigger>
              <SegmentedControlTrigger value="json" className="gap-1.5 px-2 text-label-xs">
                <RiCodeSSlashLine className="size-[15px]" />
                JSON
              </SegmentedControlTrigger>
            </SegmentedControlList>
          </SegmentedControl>
        )}

        {(item.status === 'added' || item.status === 'deleted') && <ResourceStatusBadge status={item.status} />}
        {step?.action === 'moved' && (
          <span className="shrink-0 text-paragraph-xs text-text-soft">{movedStepLabel(step)}</span>
        )}
        {step && step.action !== 'moved' && <DiffStat stat={step.diffStat} showBars={false} />}

        <button
          type="button"
          onClick={toggle}
          disabled={!canExpand}
          aria-label={expanded ? `Collapse ${item.name}` : `Expand ${item.name}`}
          className={cn('flex size-4 shrink-0 items-center justify-center text-text-soft', !canExpand && 'invisible')}
        >
          <Chevron className="size-4" />
        </button>
      </div>

      {item.status === 'deleted' && (
        <div className="px-3 pb-2">
          <ChangeNote icon={SquareMinus} tone="error" text={removalNote([])} />
        </div>
      )}

      {expanded && step && stepType && (
        <div className="min-w-0 px-3 pb-3">
          <div className="flex min-w-0 flex-col gap-1 rounded-lg border border-stroke-weak bg-bg-weak p-1.5">
            <div className="flex gap-1.5">
              <EnvironmentHeader name={environmentNames.target} tone="feature" />
              <EnvironmentHeader name={environmentNames.source} tone="warning" />
            </div>
            {view === 'preview' && canPreview ? (
              <div className="flex items-start gap-1.5">
                <StepPreviewPane
                  environment={environments.target}
                  environmentName={environmentNames.target}
                  workflowId={workflowId}
                  stepId={step.stepId}
                  stepType={stepType}
                  present={step.previous !== null}
                />
                <StepPreviewPane
                  environment={environments.source}
                  environmentName={environmentNames.source}
                  workflowId={workflowId}
                  stepId={step.stepId}
                  stepType={stepType}
                  present={step.next !== null}
                />
              </div>
            ) : (
              <StepJsonCompare step={step} environmentNames={environmentNames} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StepJsonCompare({ step, environmentNames }: { step: StepChange; environmentNames: EnvironmentNames }) {
  return (
    <JsonDiffCompare
      lineDiff={step.lineDiff}
      hasPrevious={step.previous !== null}
      hasNext={step.next !== null}
      environmentNames={environmentNames}
    />
  );
}
