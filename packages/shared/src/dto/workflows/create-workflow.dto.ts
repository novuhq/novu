import { WorkflowCreationSourceEnum } from '../../types';
import { PreferencesRequestDto, StepCreateDto, WorkflowCommonsFields } from './workflow-response.dto';

export type CreateWorkflowDto = Omit<WorkflowCommonsFields, '_id'> & {
  steps: StepCreateDto[];

  __source: WorkflowCreationSourceEnum;

  preferences?: PreferencesRequestDto;
};
