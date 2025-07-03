import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDefined,
  IsEnum,
  IsMongoId,
  IsObject,
  IsOptional,
  IsString,
  Length,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import {
  CustomDataType,
  WorkflowStatusEnum,
  ResourceTypeEnum,
  MAX_DESCRIPTION_LENGTH,
  MAX_NAME_LENGTH,
  MAX_TAG_LENGTH,
} from '@novu/shared';

import { Type } from 'class-transformer';
import { RuntimeIssue } from '@novu/dal';
import {
  EnvironmentWithUserCommand,
  PreferencesRequired,
  ContentIssue,
  IStepControl,
  JSONSchema,
  NotificationStep,
} from '@novu/application-generic';

export class UpdateWorkflowCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsMongoId()
  id: string;

  @IsOptional()
  @IsString()
  @Length(1, MAX_NAME_LENGTH)
  name: string;

  @IsString()
  @IsOptional()
  @Length(0, MAX_DESCRIPTION_LENGTH)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Length(1, MAX_TAG_LENGTH, { each: true })
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsArray()
  @ValidateNested()
  @IsOptional()
  steps?: NotificationStep[];

  @IsOptional()
  @IsMongoId()
  notificationGroupId?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => PreferencesRequired)
  @ValidateIf((object, value) => value !== null)
  @IsOptional()
  userPreferences?: PreferencesRequired | null;

  @IsBoolean()
  @IsOptional()
  critical?: boolean;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => PreferencesRequired)
  defaultPreferences: PreferencesRequired;

  @ValidateNested()
  @IsOptional()
  replyCallback?: {
    active: boolean;
    url: string;
  };

  @IsOptional()
  data?: CustomDataType;

  @IsOptional()
  inputs?: IStepControl;

  @IsOptional()
  controls?: IStepControl;

  @IsOptional()
  rawData?: Record<string, unknown>;

  @IsOptional()
  payloadSchema?: JSONSchema;

  @IsOptional()
  @IsBoolean()
  validatePayload?: boolean;

  @IsEnum(ResourceTypeEnum)
  @IsDefined()
  type: ResourceTypeEnum;

  @IsString()
  @IsOptional()
  workflowId?: string;

  @IsObject()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Array<ContentIssue>)
  issues?: Record<string, RuntimeIssue[]>;

  @IsEnum(WorkflowStatusEnum)
  @IsOptional()
  status?: WorkflowStatusEnum;
}
