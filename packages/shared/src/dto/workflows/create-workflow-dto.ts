import { PreferencesRequestDto, StepCreateDto, WorkflowCommonsFields } from './workflow-commons-fields';
import { WorkflowCreationSourceEnum } from '../../types';

export type CreateWorkflowDto = WorkflowCommonsFields & {
  steps: StepCreateDto[];

  __source: WorkflowCreationSourceEnum;

  preferences?: PreferencesRequestDto;
};
