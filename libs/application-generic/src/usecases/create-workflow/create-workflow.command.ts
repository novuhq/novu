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
  BuilderFieldType,
  BuilderGroupValues,
  ChannelCTATypeEnum,
  StepContentIssue as StepContentIssueDto,
  CustomDataType,
  FilterParts,
  IMessageAction,
  INotificationGroup,
  IStepVariant,
  IWorkflowStepMetadata,
  JSONSchemaDto,
  StepContentIssueEnum,
  StepCreateAndUpdateKeys,
  StepIssue as StepIssueDto,
  StepIssueEnum,
  StepIssuesDto,
  WorkflowOriginEnum,
  WorkflowStatusEnum,
  WorkflowTypeEnum,
} from '@novu/shared';

import { Type } from 'class-transformer';
import { RuntimeIssue } from '@novu/dal';
import { EnvironmentWithUserCommand } from '../../commands';
import { PreferencesRequired } from '../upsert-preferences';
import { MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH, MAX_TAG_LENGTH } from '../workflow';

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
    schema: JSONSchemaDto;
  };
  @IsOptional()
  controls?: {
    schema: JSONSchemaDto;
  };

  @IsOptional()
  rawData?: Record<string, unknown>;

  @IsOptional()
  payloadSchema?: JSONSchemaDto;

  @IsEnum(WorkflowTypeEnum)
  @IsDefined()
  type: WorkflowTypeEnum;

  @IsEnum(WorkflowOriginEnum)
  @IsDefined()
  origin: WorkflowOriginEnum;

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

export class ChannelCTACommand {
  @IsEnum(ChannelCTATypeEnum)
  type: ChannelCTATypeEnum;

  @ValidateNested()
  data: {
    url: string;
  };

  @IsOptional()
  @IsArray()
  @ValidateNested()
  action?: IMessageAction[];
}

export class ContentIssue implements StepContentIssueDto {
  @IsOptional()
  @IsString()
  variableName?: string;

  @IsString()
  message: string;

  @IsEnum(StepContentIssueEnum)
  issueType: StepContentIssueEnum;
}

export class StepIssue implements StepIssueDto {
  @IsEnum(StepIssueEnum)
  issueType: StepIssueEnum; // Union of both

  @IsOptional()
  @IsString()
  variableName?: string;

  @IsString()
  message: string;
}

export class StepIssues implements StepIssuesDto {
  @IsOptional()
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => StepIssue)
  body?: Record<StepCreateAndUpdateKeys, StepIssue>;

  @IsOptional()
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => ContentIssue)
  controls?: Record<string, ContentIssue[]>;
}

export class NotificationStepVariantCommand implements IStepVariant {
  @IsString()
  @IsOptional()
  _templateId?: string;

  @ValidateNested()
  @IsOptional()
  template?: any;

  @IsOptional()
  uuid?: string;

  @IsOptional()
  name?: string;

  @IsBoolean()
  active?: boolean;

  @IsBoolean()
  shouldStopOnFail?: boolean;

  @ValidateNested()
  @IsOptional()
  replyCallback?: {
    active: boolean;
    url: string;
  };

  @IsOptional()
  @IsArray()
  @ValidateNested()
  filters?: MessageFilter[];

  @IsMongoId()
  @IsOptional()
  _id?: string;

  @IsOptional()
  metadata?: IWorkflowStepMetadata;

  @IsOptional()
  controls?: IStepControl;

  @IsOptional()
  output?: IStepControl;

  @IsOptional()
  stepId?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => StepIssues)
  issues?: StepIssues;
}

export class NotificationStep extends NotificationStepVariantCommand {
  @IsOptional()
  @IsArray()
  @ValidateNested()
  variants?: NotificationStepVariantCommand[];
}

export class MessageFilter {
  isNegated?: boolean;

  @IsString()
  type?: BuilderFieldType;

  @IsString()
  value: BuilderGroupValues;

  @IsArray()
  children: FilterParts[];
}

export interface IStepControl {
  schema: JSONSchemaDto;
}
