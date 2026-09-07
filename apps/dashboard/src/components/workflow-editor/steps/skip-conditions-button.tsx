import { ResourceOriginEnum, StepResponseDto } from '@novu/shared';
import { RiArrowRightSLine, RiGuideFill } from 'react-icons/ri';
import { RQBJsonLogic } from 'react-querybuilder';
import { Link } from 'react-router-dom';

import { Button } from '@/components/primitives/button';
import { useConditionsCount } from '@/hooks/use-conditions-count';
import { cn } from '@/utils/ui';

const SIDEPANEL_ACTION_ROW_BASE_CLASS = 'flex h-12 w-full justify-start gap-1.5 rounded-none px-3 text-xs font-medium';

type SkipConditionsButtonProps = {
  origin: ResourceOriginEnum;
  step: StepResponseDto;
  className?: string;
};

export function SkipConditionsButton({ origin, step, className }: SkipConditionsButtonProps) {
  const canEditStepConditions = origin === ResourceOriginEnum.NOVU_CLOUD;
  const uiSchema = step.controls.uiSchema;
  const skip = uiSchema?.properties?.skip;

  const conditionsCount = useConditionsCount(step.controls.values.skip as RQBJsonLogic);

  if (!skip || !canEditStepConditions) {
    return null;
  }

  return (
    <Link to={'./conditions'} relative="path" state={{ stepType: step.type }} className="block">
      <Button
        variant="secondary"
        mode="ghost"
        className={cn(SIDEPANEL_ACTION_ROW_BASE_CLASS, 'border-b border-stroke-soft', className)}
        leadingIcon={RiGuideFill}
        trailingIcon={RiArrowRightSLine}
      >
        Step conditions
        <span className="text-text-soft ml-auto">{conditionsCount > 0 ? conditionsCount : ''}</span>
      </Button>
    </Link>
  );
}
