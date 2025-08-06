import { ResourceOriginEnum, StepResponseDto } from '@novu/shared';
import { RiArrowRightSLine, RiGuideFill } from 'react-icons/ri';
import { RQBJsonLogic } from 'react-querybuilder';
import { Link } from 'react-router-dom';

import { Button } from '@/components/primitives/button';
import { useConditionsCount } from '@/hooks/use-conditions-count';

export function SkipConditionsButton({ origin, step }: { origin: ResourceOriginEnum; step: StepResponseDto }) {
  const canEditStepConditions = origin === ResourceOriginEnum.NOVU_CLOUD;
  const uiSchema = step.controls.uiSchema;
  const skip = uiSchema?.properties?.skip;

  const conditionsCount = useConditionsCount(step.controls.values.skip as RQBJsonLogic);

  if (!skip || !canEditStepConditions) {
    return null;
  }

  return (
    <Link to={'./conditions'} relative="path" state={{ stepType: step.type }}>
      <Button variant="secondary" mode="outline" className="flex w-full justify-start gap-1.5 text-xs font-medium">
        <RiGuideFill className="h-4 w-4 text-neutral-600" />
        Step Conditions
        {conditionsCount > 0 && (
          <span className="ml-auto flex items-center gap-0.5">
            <span>{conditionsCount}</span>
            <RiArrowRightSLine className="ml-auto h-4 w-4 text-neutral-600" />
          </span>
        )}
      </Button>
    </Link>
  );
}
