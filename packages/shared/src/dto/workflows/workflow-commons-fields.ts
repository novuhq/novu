import { IsArray, IsBoolean, IsDefined, IsObject, IsOptional, IsString } from 'class-validator';

import { JSONSchema } from 'json-schema-to-ts';
import { WorkflowResponseDto } from './workflow-response-dto';
import { StepTypeEnum, WorkflowPreferences } from '../../types';

export class ControlsSchema {
  schema: JSONSchema;
}

export type ListWorkflowResponse = {
  workflows: WorkflowListResponseDto[];
  totalCount: number;
};

export type WorkflowListResponseDto = Pick<
  WorkflowResponseDto,
  'name' | 'tags' | 'updatedAt' | 'createdAt' | 'id' | 'status' | 'type' | 'origin'
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
  controlSchema: JSONSchema;

  @IsObject()
  controlValues: Record<string, unknown>;
}

export class WorkflowCommonsFields {
  @IsString()
  @IsDefined()
  id: string;

  @IsString()
  @IsDefined()
  slug: string;

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

export class StepResponseDto extends StepDto {
  @IsString()
  @IsDefined()
  id: string;

  @IsString()
  @IsDefined()
  slug: string;
}

export class StepUpdateDto extends StepDto {
  @IsString()
  @IsDefined()
  slug: string;
}

export class StepCreateDto extends StepDto {}

export type PreferencesResponseDto = {
  user: WorkflowPreferences | null;
  default: WorkflowPreferences;
};

export type PreferencesRequestDto = {
  user: WorkflowPreferences | null;
};
