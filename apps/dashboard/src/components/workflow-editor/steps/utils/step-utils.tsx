import { StepTypeEnum } from '@novu/shared';
import { STEP_TYPE_LABELS } from '@/utils/constants';

export function getEditorTitle(stepType: StepTypeEnum): string {
  const label = STEP_TYPE_LABELS[stepType];

  return `${label} Editor`;
}
