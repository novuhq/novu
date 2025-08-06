import { type StepResponseDto, type WorkflowResponseDto } from '@novu/shared';

export type StepEditorProps = {
  workflow: WorkflowResponseDto;
  step: StepResponseDto;
};
