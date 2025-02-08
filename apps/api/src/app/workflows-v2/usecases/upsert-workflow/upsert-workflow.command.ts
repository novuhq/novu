import {
  IsOptional,
  IsString,
  ValidateNested,
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  Length,
  IsObject,
  IsDefined,
} from 'class-validator';
import { Type } from 'class-transformer';

import { EnvironmentWithUserObjectCommand, MAX_NAME_LENGTH } from '@novu/application-generic';
import { StepTypeEnum, WorkflowCreationSourceEnum, ChannelTypeEnum, WorkflowOriginEnum } from '@novu/shared';

export class ChannelPreferenceData {
  @IsBoolean()
  enabled: boolean;
}

export class WorkflowPreferenceData {
  @IsBoolean()
  enabled: boolean;

  @IsBoolean()
  readOnly: boolean;
}

export class WorkflowPreferencesUpsertData {
  @ValidateNested()
  all: WorkflowPreferenceData;

  @IsObject()
  @ValidateNested({ each: true })
  channels: Record<ChannelTypeEnum, ChannelPreferenceData>;
}

export class PreferencesRequestUpsertDataCommand {
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkflowPreferencesUpsertData)
  user: WorkflowPreferencesUpsertData | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkflowPreferencesUpsertData)
  workflow?: WorkflowPreferencesUpsertData | null;
}

export class UpsertStepDataCommand {
  @IsString()
  @IsNotEmpty()
  @Length(1, MAX_NAME_LENGTH)
  name: string;

  @IsEnum(StepTypeEnum)
  type: StepTypeEnum;

  @IsOptional()
  controlValues?: Record<string, unknown> | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  _id?: string;
}

export class UpsertWorkflowDataCommand {
  @IsString()
  @IsOptional()
  workflowId?: string;

  @IsEnum(WorkflowOriginEnum)
  @IsDefined()
  origin: WorkflowOriginEnum;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertStepDataCommand)
  steps: UpsertStepDataCommand[];

  @IsOptional()
  @ValidateNested()
  @Type(() => PreferencesRequestUpsertDataCommand)
  preferences?: PreferencesRequestUpsertDataCommand;

  @IsString()
  @IsNotEmpty()
  @Length(1, MAX_NAME_LENGTH)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(16, { message: 'tags must contain no more than 16 elements' })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsEnum(WorkflowCreationSourceEnum)
  __source?: WorkflowCreationSourceEnum;
}

export class UpsertWorkflowCommand extends EnvironmentWithUserObjectCommand {
  @IsOptional()
  @IsString()
  workflowIdOrInternalId?: string;

  @ValidateNested()
  @Type(() => UpsertWorkflowDataCommand)
  workflowDto: UpsertWorkflowDataCommand;
}
