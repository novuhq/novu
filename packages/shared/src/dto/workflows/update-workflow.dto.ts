import { PreferencesRequestDto, StepCreateDto, StepUpdateDto, WorkflowCommonsFields } from './workflow-response.dto';

export type UpdateWorkflowDto = Omit<WorkflowCommonsFields, '_id'> & {
  updatedAt: string;

  steps: (StepCreateDto | StepUpdateDto)[];

  preferences: PreferencesRequestDto;
};
