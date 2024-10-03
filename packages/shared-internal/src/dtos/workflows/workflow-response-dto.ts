import { WorkflowOriginEnum, WorkflowTypeEnum } from '@novu/shared';
import { PreferencesResponseDto, StepResponseDto, WorkflowCommonsFields } from './workflow-commons-fields';
import { WorkflowStatusEnum } from './workflow-status-enum';

export class WorkflowResponseDto extends WorkflowCommonsFields {
  updatedAt: string;

  createdAt: string;

  steps: StepResponseDto[];

  origin: WorkflowOriginEnum;

  preferences: PreferencesResponseDto;

  status: WorkflowStatusEnum;

  type: WorkflowTypeEnum;
}
