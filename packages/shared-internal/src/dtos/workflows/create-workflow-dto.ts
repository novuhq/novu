import { WorkflowCreationSourceEnum } from '@novu/shared';
import { PreferencesRequestDto, StepCreateDto, WorkflowCommonsFields } from './workflow-commons-fields';

export type CreateWorkflowDto = Omit<WorkflowCommonsFields, '_id'> & {
  steps: StepCreateDto[];

  __source: WorkflowCreationSourceEnum;

  preferences?: PreferencesRequestDto;
};
