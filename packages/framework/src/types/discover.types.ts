import { ValidateFunction } from 'ajv';

import { ActionStepEnum, ChannelStepEnum } from '../constants';
import { Schema } from './schema.types';
import { ActionStepOptions } from './step.types';
import { Execute, WorkflowOptions } from './workflow.types';

export type StepType = `${ChannelStepEnum | ActionStepEnum}`;

export type Validate = ValidateFunction;

export type DiscoverProviderOutput = {
  type: string;
  code: string;
  resolve: (stepInputs: unknown) => unknown | Promise<unknown>;
  outputs: {
    schema: Schema;
    validate: Validate;
  };
};

export type DiscoverStepOutput = {
  stepId: string;
  type: StepType;
  inputs: {
    schema: Schema;
    validate: Validate;
  };
  outputs: {
    schema: Schema;
    validate: Validate;
  };
  results: {
    schema: Schema;
    validate: Validate;
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
    validate: Validate;
  };
  inputs: {
    schema: Schema;
    validate: Validate;
  };
};

export type DiscoverOutput = {
  workflows: Array<DiscoverWorkflowOutput>;
};
