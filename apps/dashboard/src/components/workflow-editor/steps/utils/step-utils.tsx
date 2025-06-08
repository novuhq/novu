import { StepTypeEnum, WorkflowOriginEnum, WorkflowResponseDto, StepResponseDto } from '@novu/shared';
import { STEP_TYPE_LABELS } from '@/utils/constants';
import { STEP_TYPE_TO_ICON } from '@/components/icons/utils';

export function StepIcon({ stepType }: { stepType: StepTypeEnum }) {
  const Icon = STEP_TYPE_TO_ICON[stepType];
  return <Icon className="size-3.5" />;
}

export function getEditorTitle(stepType: StepTypeEnum): string {
  const label = STEP_TYPE_LABELS[stepType];
  return `${label} Editor`;
}

export function isStepEditable(workflow: WorkflowResponseDto, step: StepResponseDto): boolean {
  const { dataSchema, uiSchema } = step.controls;
  const isNovuCloud = workflow.origin === WorkflowOriginEnum.NOVU_CLOUD && uiSchema;
  const isExternal = workflow.origin === WorkflowOriginEnum.EXTERNAL;

  return isExternal || (isNovuCloud && !!uiSchema);
}
