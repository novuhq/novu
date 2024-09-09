import { IsArray, IsBoolean, IsDefined, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { JsonSchema, StepType } from '@novu/framework';
import { IPreferenceChannels, WorkflowOriginEnum } from '@novu/shared';

class Schema {
  @IsDefined()
  schema: JsonSchema;
}

export class CreateWorkflowCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  workflowId: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ValidateNested()
  @Type(() => WorkflowOptionsCommand)
  options: WorkflowOptionsCommand;

  @IsString()
  @IsDefined()
  code: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepCommand)
  steps: Array<StepCommand>;

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

export class WorkflowOptionsCommand {
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

  @IsOptional()
  @IsString()
  notificationGroupId?: string;

  @IsDefined()
  preferenceSettings: IPreferenceChannels;
}

export class StepCommand {
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

  // providers: Array<unknown>;

  @ValidateNested()
  @Type(() => StepOptionsCommand)
  options: StepOptionsCommand;
}

export class StepOptionsCommand {
  // skip?: unknown;

  @IsOptional()
  @ValidateNested()
  @Type(() => Schema)
  controlSchema?: Schema;

  @IsOptional()
  @ValidateNested()
  @Type(() => ReplyCallbackCommand)
  replyCallback?: ReplyCallbackCommand;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  shouldStopOnFail?: boolean;
}

export class ReplyCallbackCommand {
  @IsBoolean()
  @IsDefined()
  active: boolean;

  @IsString()
  @IsDefined()
  url: string;
}
