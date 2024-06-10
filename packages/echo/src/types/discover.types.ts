import { ActionStepEnum, ChannelStepEnum } from '../constants';
import { Schema, ValidateFunction } from './schema.types';
import { ActionStepOptions } from './step.types';
import { Execute, WorkflowOptions } from './workflow.types';

export type StepType = `${ChannelStepEnum | ActionStepEnum}`;

export type DiscoverProviderOutput = {
  type: string;
  code: string;
  resolve: (stepInputs: unknown) => unknown | Promise<unknown>;
  outputs: {
    schema: Schema;
    validate: ValidateFunction;
  };
};

export type DiscoverStepOutput = {
  stepId: string;
  type: StepType;
  inputs: {
    schema: Schema;
    validate: ValidateFunction;
  };
  outputs: {
    schema: Schema;
    validate: ValidateFunction;
  };
  results: {
    schema: Schema;
    validate: ValidateFunction;
  };
  code: string;
  resolve: (stepInputs: unknown) => unknown | Promise<unknown>;
  providers: Array<DiscoverProviderOutput>;
  options: ActionStepOptions;
};

export type DiscoverWorkflowOutput = {
  workflowId: string;
  execute: Execute<unknown, unknown>;
  options: WorkflowOptions<unknown, unknown>;
  code: string;
  steps: Array<DiscoverStepOutput>;
  data: {
    schema: Schema;
    validate: ValidateFunction;
  };
  inputs: {
    schema: Schema;
    validate: ValidateFunction;
  };
};

export type DiscoverOutput = {
  workflows: Array<DiscoverWorkflowOutput>;
};
