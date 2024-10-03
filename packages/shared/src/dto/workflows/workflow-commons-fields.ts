import { JSONSchema } from 'json-schema-to-ts';
import { WorkflowResponseDto } from './workflow-response-dto';
import { StepTypeEnum, WorkflowPreferences } from '../../types';

export class ControlsSchema {
  schema: JSONSchema;
}

export type StepResponseDto = StepDto & {
  stepUuid: string;
  slug: string;
  controls: ControlsSchema;
};

export type StepUpdateDto = StepDto & {
  stepUuid: string;
};

export type StepCreateDto = StepDto;

export type ListWorkflowResponse = {
  workflows: WorkflowListResponseDto[];
  totalCount: number;
};

export type WorkflowListResponseDto = Pick<
  WorkflowResponseDto,
  'name' | 'tags' | 'updatedAt' | 'createdAt' | '_id' | 'status' | 'type' | 'origin'
> & {
  stepTypeOverviews: StepTypeEnum[];
};

export class StepDto {
  name: string;

  type: StepTypeEnum;

  controlValues: Record<string, unknown>;
}

export class WorkflowCommonsFields {
  _id: string;

  tags?: string[];

  active?: boolean;

  name: string;

  workflowId: string;

  description?: string;
}

export type PreferencesResponseDto = {
  user: WorkflowPreferences | null;
  default: WorkflowPreferences;
};

export type PreferencesRequestDto = {
  user: WorkflowPreferences | null;
};
