import { PreferencesRequestDto, StepCreateDto, WorkflowCommonsFields } from './workflow-commons-fields';
import { WorkflowCreationSourceEnum } from '../../types';

export type CreateWorkflowDto = Omit<WorkflowCommonsFields, '_id'> & {
  steps: StepCreateDto[];

  __source: WorkflowCreationSourceEnum;

  preferences?: PreferencesRequestDto;
};
