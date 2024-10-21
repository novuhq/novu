import { WorkflowCreationSourceEnum } from '../../types';
import { PreferencesRequestDto, StepCreateDto, WorkflowCommonsFields } from './workflow-commons-fields';

export type CreateWorkflowDto = WorkflowCommonsFields & {
  steps: StepCreateDto[];

  __source: WorkflowCreationSourceEnum;

  preferences?: PreferencesRequestDto;
};
