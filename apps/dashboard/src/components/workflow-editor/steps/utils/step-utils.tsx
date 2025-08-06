import { ResourceOriginEnum, StepResponseDto, StepTypeEnum, WorkflowResponseDto } from '@novu/shared';
import { STEP_TYPE_LABELS } from '@/utils/constants';
import { getStepTypeIcon } from './preview-context.utils';

export function StepIcon({ stepType }: { stepType: StepTypeEnum }) {
  const Icon = getStepTypeIcon(stepType);

  return <Icon className="size-3.5" />;
}

export function getEditorTitle(stepType: StepTypeEnum): string {
  const label = STEP_TYPE_LABELS[stepType];

  return `${label} Editor`;
}

export function isStepEditable(workflow: WorkflowResponseDto, step: StepResponseDto): boolean {
  const { dataSchema, uiSchema } = step.controls;
  const isNovuCloud = workflow.origin === ResourceOriginEnum.NOVU_CLOUD && Boolean(uiSchema);
  const isExternal = workflow.origin === ResourceOriginEnum.EXTERNAL;

  return isExternal || (isNovuCloud && Boolean(uiSchema));
}
