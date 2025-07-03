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
  INotificationGroup,
  ResourceOriginEnum,
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
  ContentIssue,
  JSONSchema,
  NotificationStep,
  PreferencesRequired,
} from '@novu/application-generic';

export class CreateWorkflowCommand extends EnvironmentWithUserCommand {
  @IsDefined()
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
  active: boolean;

  @IsDefined()
  @IsArray()
  @ValidateNested()
  steps: NotificationStep[];

  @IsBoolean()
  @IsOptional()
  draft?: boolean;

  @IsMongoId()
  @IsDefined()
  notificationGroupId?: string;

  @IsOptional()
  notificationGroup?: INotificationGroup;

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

  @IsOptional()
  blueprintId?: string;

  @IsOptional()
  @IsString()
  __source?: string;

  @IsOptional()
  data?: CustomDataType;

  @IsOptional()
  inputs?: {
    schema: JSONSchema;
  };
  @IsOptional()
  controls?: {
    schema: JSONSchema;
  };

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

  @IsEnum(ResourceOriginEnum)
  @IsDefined()
  origin: ResourceOriginEnum;

  /**
   * Optional identifier for the workflow trigger.
   * This allows overriding the default trigger identifier generation strategy in the use case.
   * If provided, the use case will use this value instead of generating one.
   * If not provided, the use case will generate a trigger identifier based on its internal logic.
   */
  @IsOptional()
  @IsString()
  triggerIdentifier?: string;
  @IsObject()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ContentIssue)
  issues?: Record<string, RuntimeIssue>;

  @IsEnum(WorkflowStatusEnum)
  @IsOptional()
  status?: WorkflowStatusEnum;
}
