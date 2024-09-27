import { IsArray, IsBoolean, IsDefined, IsObject, IsOptional, IsString } from 'class-validator';

import { JsonSchema } from '@novu/framework';
import { StepTypeEnum, WorkflowPreferences } from '@novu/shared';
import { WorkflowResponseDto } from './workflow-response-dto';

export class ControlsSchema {
  schema: JsonSchema;
}

export type StepResponseDto = StepDto & {
  stepUuid: string;
};

export type StepUpdateDto = StepDto & {
  stepUuid: string;
};

export type StepCreateDto = StepDto;

export type ListWorkflowResponse = {
  workflows: WorkflowListResponseDto[];
  totalResults: number;
};

export type WorkflowListResponseDto = Pick<WorkflowResponseDto, 'name' | 'tags' | 'updatedAt' | 'createdAt' | '_id'> & {
  stepTypeOverviews: StepTypeEnum[];
};

export class StepDto {
  @IsString()
  @IsDefined()
  name: string;

  @IsString()
  @IsDefined()
  type: StepTypeEnum;

  @IsOptional()
  controls?: ControlsSchema;

  @IsObject()
  controlValues: Record<string, unknown>;
}

export class WorkflowCommonsFields {
  @IsString()
  @IsDefined()
  _id: string;

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
