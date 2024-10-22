import { IsDefined, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { EnvironmentWithUserCommand, IStepControl } from '@novu/application-generic';
import { IPreferenceChannels, CustomDataType, StepType } from '@novu/shared';

import { IStepOutput, IWorkflowDefineStep } from '../../shared';

interface IWorkflowDefineOptions {
  version?: `${number}.${number}.${number}`;

  critical?: boolean;

  active?: boolean;

  tags?: string[];

  description: string;

  preferenceSettings?: IPreferenceChannels;

  data?: CustomDataType;

  payloadSchema?: Record<string, unknown>;

  notificationGroupId?: string;
}

export class WorkflowDefineOptions implements IWorkflowDefineOptions {
  @IsString()
  version: `${number}.${number}.${number}`;

  critical?: boolean;

  active?: boolean;

  tags?: string[];

  description: string;

  preferenceSettings?: IPreferenceChannels;

  data?: CustomDataType;
}

interface IStepDefineOptions {
  version: `${number}.${number}.${number}`;
  failOnErrorEnabled: boolean;
  skip: boolean;
  active?: boolean;
}

class WorkflowDefineStep implements IWorkflowDefineStep {
  @IsString()
  stepId: string;

  @IsString()
  type: StepType;

  inputs: IStepControl;
  controls: IStepControl;

  outputs: IStepOutput;

  options?: IStepDefineOptions;

  code: string;
}

export interface IWorkflowDefine {
  workflowId: string;

  options?: IWorkflowDefineOptions;

  code: string;

  steps: IWorkflowDefineStep[];

  inputs?: IStepControl;
  controls?: IStepControl;
}

export class WorkflowDefine implements IWorkflowDefine {
  @IsString()
  workflowId: string;

  @ValidateNested({ each: true })
  @Type(() => WorkflowDefineOptions)
  options?: IWorkflowDefineOptions;

  code: string;

  @ValidateNested({ each: true })
  @Type(() => WorkflowDefineStep)
  steps: IWorkflowDefineStep[];

  inputs?: IStepControl;
  controls?: IStepControl;
}

export interface ICreateBridges {
  workflows?: IWorkflowDefine[];
}

export class SyncCommand extends EnvironmentWithUserCommand implements ICreateBridges {
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => WorkflowDefine)
  workflows?: WorkflowDefine[];

  @IsString()
  @IsDefined()
  bridgeUrl: string;

  @IsOptional()
  @IsString()
  source?: string;
}
