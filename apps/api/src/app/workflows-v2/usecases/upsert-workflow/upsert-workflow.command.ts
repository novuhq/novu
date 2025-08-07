import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { ClientSession } from '@novu/dal';
import {
  ChannelTypeEnum,
  MAX_NAME_LENGTH,
  ResourceOriginEnum,
  SeverityLevelEnum,
  StepTypeEnum,
  WorkflowCreationSourceEnum,
} from '@novu/shared';
import { Exclude, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { IsValidJsonSchema } from '../../../shared/validators/json-schema.validator';

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
  @IsDefined()
  @Length(1, MAX_NAME_LENGTH)
  name: string;

  @IsEnum(StepTypeEnum)
  @IsDefined()
  @IsNotEmpty()
  type: StepTypeEnum;

  @IsOptional()
  controlValues?: Record<string, unknown> | null;

  @IsOptional()
  @IsString()
  _id?: string;

  @IsOptional()
  @IsString()
  stepId?: string;
}

export class UpsertWorkflowDataCommand {
  @IsString()
  @IsOptional()
  workflowId?: string;

  @IsEnum(ResourceOriginEnum)
  @IsDefined()
  origin: ResourceOriginEnum;

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

  @IsOptional()
  @IsValidJsonSchema({
    message: 'payloadSchema must be a valid JSON schema',
    nullable: true,
  })
  payloadSchema?: object | null;

  @IsOptional()
  @IsBoolean()
  validatePayload?: boolean;

  @IsOptional()
  @IsBoolean()
  isTranslationEnabled?: boolean;

  @IsOptional()
  @IsEnum(SeverityLevelEnum)
  severity?: SeverityLevelEnum;
}

export class UpsertWorkflowCommand extends EnvironmentWithUserObjectCommand {
  @ValidateNested()
  @Type(() => UpsertWorkflowDataCommand)
  workflowDto: UpsertWorkflowDataCommand;

  @IsOptional()
  @IsBoolean()
  preserveWorkflowId?: boolean;

  @IsOptional()
  @IsString()
  workflowIdOrInternalId?: string;

  /**
   * Exclude session from the command to avoid serializing it in the response
   */
  @IsOptional()
  @Exclude()
  session?: ClientSession | null;
}
