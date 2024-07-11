import { IMessageTemplate, INotificationTemplateStep, StepType } from '@novu/shared';
import { IStepControl } from '@novu/application-generic';
import { Schema } from '@novu/framework';

export type Steps = INotificationTemplateStep & IMessageTemplate;

export interface IStepOutput {
  schema: Schema;
}

export interface IStepDefineOptions {
  version: `${number}.${number}.${number}`;
  failOnErrorEnabled: boolean;
  skip: boolean;
  active?: boolean;
}

export interface IWorkflowDefineStep {
  stepId: string;

  type: StepType;

  inputs: IStepControl;
  controls: IStepControl;

  outputs: IStepOutput;

  options?: IStepDefineOptions;

  code: string;
}

export enum BridgeErrorCodeEnum {
  BRIDGE_UNEXPECTED_RESPONSE = 'BRIDGE_UNEXPECTED_RESPONSE',
  BRIDGE_ENDPOINT_NOT_FOUND = 'BRIDGE_ENDPOINT_NOT_FOUND',
}
