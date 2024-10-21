import { IMessageTemplate, INotificationTemplateStep, StepType } from '@novu/shared';
import { IStepControl } from '@novu/application-generic';
import { JsonSchema } from '@novu/framework/internal';

export type Steps = INotificationTemplateStep & IMessageTemplate;

export interface IStepOutput {
  schema: JsonSchema;
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
