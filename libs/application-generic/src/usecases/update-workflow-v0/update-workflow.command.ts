import { ClientSession, NotificationTemplateEntity } from '@novu/dal';
import {
  CustomDataType,
  MAX_DESCRIPTION_LENGTH,
  MAX_NAME_LENGTH,
  MAX_TAG_LENGTH,
  ResourceTypeEnum,
  RuntimeIssue,
  SeverityLevelEnum,
} from '@novu/shared';
import { Exclude, Type } from 'class-transformer';
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
import { EnvironmentWithUserCommand } from '../../commands';
import { ContentIssue, IStepControl, JSONSchema, NotificationStep } from '../../value-objects';
import { PreferencesRequired } from '../upsert-preferences';

export class UpdateWorkflowCommandV0 extends EnvironmentWithUserCommand {
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
  @ValidateIf((_, value) => value !== null)
  description?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Length(1, MAX_TAG_LENGTH, { each: true })
  @ValidateIf((_, value) => value !== null)
  tags?: string[] | null;

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
  @ValidateIf((_, value) => value !== null)
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
  payloadSchema?: JSONSchema | null;

  @IsOptional()
  @IsBoolean()
  validatePayload?: boolean;

  @IsOptional()
  @IsBoolean()
  isTranslationEnabled?: boolean;

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

  @IsOptional()
  @IsString()
  updatedBy?: string;

  /**
   * Exclude session from the command to avoid serializing it in the response
   */
  @IsOptional()
  @Exclude()
  session?: ClientSession | null;

  @IsOptional()
  @Exclude()
  existingWorkflow?: NotificationTemplateEntity;

  @IsOptional()
  @IsEnum(SeverityLevelEnum)
  severity?: SeverityLevelEnum;
}
