import { PreferencesResponseDto, StepResponseDto, WorkflowCommonsFields } from './workflow-response.dto';
import { WorkflowStatusEnum } from './workflow-status-enum';
import { WorkflowOriginEnum, WorkflowTypeEnum } from '../../types';

export class WorkflowResponseDto extends WorkflowCommonsFields {
  updatedAt: string;

  createdAt: string;

  steps: StepResponseDto[];

  origin: WorkflowOriginEnum;

  preferences: PreferencesResponseDto;

  status: WorkflowStatusEnum;
}
