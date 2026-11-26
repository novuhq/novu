import { CopilotWorkflowChangeEnum, type CopilotWorkflowStepChange } from '@novu/shared';
import type { IconType } from 'react-icons';
import { RiAddBoxLine, RiArrowUpDownLine, RiDeleteBinLine, RiEdit2Line } from 'react-icons/ri';
import { STEP_TYPE_TO_ICON } from '@/components/icons/utils';
import { Badge, BadgeIcon } from '@/components/primitives/badge';
import { NodeIcon, type NodeIconProps } from '@/components/workflow-editor/base-node';
import { STEP_TYPE_TO_COLOR } from '@/utils/color';
import { StepTypeEnum } from '@/utils/enums';
import { cn } from '@/utils/ui';

const CHANGE_BADGES: Record<
  CopilotWorkflowChangeEnum,
  { label: string; color: 'green' | 'blue' | 'red' | 'purple'; icon: IconType }
> = {
  [CopilotWorkflowChangeEnum.ADDED]: { label: 'Added', color: 'green', icon: RiAddBoxLine },
  [CopilotWorkflowChangeEnum.EDITED]: { label: 'Edited', color: 'blue', icon: RiEdit2Line },
  [CopilotWorkflowChangeEnum.REMOVED]: { label: 'Removed', color: 'red', icon: RiDeleteBinLine },
  [CopilotWorkflowChangeEnum.MOVED]: { label: 'Moved', color: 'purple', icon: RiArrowUpDownLine },
};

export function CopilotChangeBadge({ kind, className }: { kind: CopilotWorkflowChangeEnum; className?: string }) {
  const { label, color, icon } = CHANGE_BADGES[kind];

  return (
    <Badge
      variant="lighter"
      color={color}
      className={cn('h-[18px] shrink-0 gap-0.5 pl-1 pr-2 text-label-2xs leading-[14px]', className)}
    >
      <BadgeIcon as={icon} className="mx-0" />
      {label}
    </Badge>
  );
}

function StepGlyph({ stepType }: { stepType: string }) {
  const type = stepType as StepTypeEnum;
  const Icon = STEP_TYPE_TO_ICON[type] ?? STEP_TYPE_TO_ICON[StepTypeEnum.IN_APP];
  const color = STEP_TYPE_TO_COLOR[type] ?? STEP_TYPE_TO_COLOR[StepTypeEnum.IN_APP];

  return (
    <NodeIcon variant={color as NodeIconProps['variant']} className="size-5 shrink-0 bg-bg-white p-0">
      <Icon className="size-3" />
    </NodeIcon>
  );
}

/**
 * A step the Copilot changed: its glyph, name, id and what happened to it. `standalone` is the bordered row of the
 * checklist; `card` sits on the white list of the Suggested card, which draws the hairlines between rows.
 */
export function CopilotChangeRow({
  change,
  variant,
}: {
  change: CopilotWorkflowStepChange;
  variant: 'standalone' | 'card';
}) {
  return (
    <div
      className={cn(
        'flex h-8 flex-col justify-center px-0.5',
        variant === 'standalone'
          ? 'rounded-lg border border-stroke-soft'
          : 'border-t border-stroke-weak first:border-t-0'
      )}
    >
      <div
        className={cn(
          'flex min-w-0 flex-1 items-center gap-2 rounded-md py-1 pl-1.5 pr-1',
          variant === 'standalone' ? 'bg-bg-weak' : 'bg-bg-white'
        )}
      >
        <StepGlyph stepType={change.stepType} />
        <span className="truncate text-label-xs text-text-sub">{change.stepName}</span>
        <span className="min-w-0 flex-1 truncate font-code text-xs italic leading-4 text-text-soft">
          {change.stepId}
        </span>
        <CopilotChangeBadge kind={change.kind} />
      </div>
    </div>
  );
}
