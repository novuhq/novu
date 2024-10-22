import { IsArray, IsBoolean, IsDefined, IsObject, IsOptional, IsString } from 'class-validator';

import { JSONSchema } from 'json-schema-to-ts';
import { WorkflowResponseDto } from './workflow-response-dto';
import { Slug, StepTypeEnum, WorkflowPreferences } from '../../types';

export type IdentifierOrInternalId = string;

export class ControlsSchema {
  schema: JSONSchema;
}

export type StepResponseDto = StepDto & {
  _id: string;
  slug: Slug;
  stepId: string;
  controls: ControlsSchema;
};

export type StepUpdateDto = StepDto & {
  _id: string;
};

export type StepCreateDto = StepDto;

export type ListWorkflowResponse = {
  workflows: WorkflowListResponseDto[];
  totalCount: number;
};

export type WorkflowListResponseDto = Pick<
  WorkflowResponseDto,
  'name' | 'tags' | 'updatedAt' | 'createdAt' | '_id' | 'slug' | 'status' | 'type' | 'origin'
> & {
  stepTypeOverviews: StepTypeEnum[];
};

export class StepDto {
  @IsString()
  @IsDefined()
  name: string;

  @IsString()
  @IsDefined()
  type: StepTypeEnum;

  @IsObject()
  controlValues: Record<string, unknown>;
}

export class WorkflowCommonsFields {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsString()
  @IsDefined()
  name: string;

  @IsString()
  @IsDefined()
  workflowId: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export type PreferencesResponseDto = {
  user: WorkflowPreferences | null;
  default: WorkflowPreferences;
};

export type PreferencesRequestDto = {
  user: WorkflowPreferences | null;
};
