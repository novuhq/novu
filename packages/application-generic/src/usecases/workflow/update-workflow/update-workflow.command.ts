import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import {
  IPreferenceChannels,
  NotificationTemplateCustomData,
  WorkflowTypeEnum,
} from '@novu/shared';

import { EnvironmentWithUserCommand } from '../../../commands';
import { NotificationStep } from '../../../usecases';
import { JSONSchema7 } from 'json-schema';

export class UpdateWorkflowCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsMongoId()
  id: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  identifier?: string;

  @IsBoolean()
  @IsOptional()
  critical?: boolean;

  @IsOptional()
  preferenceSettings?: IPreferenceChannels;

  @IsOptional()
  @IsMongoId({
    message: 'Bad group id name',
  })
  notificationGroupId?: string;

  @IsArray()
  @ValidateNested()
  @IsOptional()
  steps?: NotificationStep[];

  @ValidateNested()
  @IsOptional()
  replyCallback?: {
    active: boolean;
    url: string;
  };

  @IsOptional()
  data?: NotificationTemplateCustomData;

  @IsOptional()
  inputs?: IStepInput;

  @IsOptional()
  rawData?: any;

  @IsOptional()
  payloadSchema?: Record<string, unknown>;

  @IsEnum(WorkflowTypeEnum)
  @IsDefined()
  type: WorkflowTypeEnum;
}

export interface IStepInput {
  schema: JSONSchema7;
}
