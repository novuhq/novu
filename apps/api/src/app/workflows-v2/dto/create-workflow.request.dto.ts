import { IsArray, IsBoolean, IsDefined, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { JsonSchema, StepType } from '@novu/framework';
import { IPreferenceChannels, WorkflowOriginEnum } from '@novu/shared';

class Schema {
  schema: JsonSchema;
}

export class StepDto {
  @IsString()
  @IsDefined()
  code: string;

  @IsString()
  @IsDefined()
  stepId: string;

  @IsString()
  @IsDefined()
  type: StepType;

  @ValidateNested()
  @Type(() => Schema)
  controlSchemas: Schema;

  @ValidateNested()
  @Type(() => StepOptionsDto)
  options: StepOptionsDto;
}

export class CreateWorkflowRequestDto {
  @IsString()
  @IsDefined()
  workflowId: string;

  @IsBoolean()
  @IsDefined()
  active: boolean;

  @ValidateNested()
  @Type(() => WorkflowOptionsDto)
  options: WorkflowOptionsDto;

  @IsString()
  @IsDefined()
  code: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepDto)
  steps: Array<StepDto>;

  @ValidateNested()
  @Type(() => Schema)
  controlsSchema: Schema;

  @ValidateNested()
  @Type(() => Schema)
  payloadSchema: Schema;

  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @IsString()
  @IsDefined()
  name: string;

  @IsString()
  @IsDefined()
  description: string;

  @IsEnum(WorkflowOriginEnum)
  @IsOptional()
  origin?: WorkflowOriginEnum;
}

export class WorkflowOptionsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => Schema)
  payloadSchema?: Schema;

  @IsOptional()
  @ValidateNested()
  @Type(() => Schema)
  controlSchema?: Schema;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  critical?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsDefined()
  @IsString()
  notificationGroupId: string;

  @IsDefined()
  preferenceSettings: IPreferenceChannels;
}

export class StepOptionsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => Schema)
  controlSchema?: Schema;

  @IsOptional()
  @ValidateNested()
  @Type(() => ReplyCallbackDto)
  replyCallback?: ReplyCallbackDto;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  shouldStopOnFail?: boolean;
}

export class ReplyCallbackDto {
  @IsBoolean()
  @IsDefined()
  active: boolean;

  @IsString()
  @IsDefined()
  url: string;
}
