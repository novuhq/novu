import { ActionStepEnum, ChannelStepEnum } from '../constants';
import { JsonSchema, Schema } from './schema.types';
import { StepOptions } from './step.types';
import { Execute, WorkflowOptions } from './workflow.types';
import { Awaitable } from './util.types';

export type StepType = `${ChannelStepEnum | ActionStepEnum}`;

export type DiscoverProviderOutput = {
  type: string;
  code: string;
  resolve: (inputs: unknown) => Awaitable<unknown>;
  outputs: {
    schema: JsonSchema;
    unknownSchema: Schema;
  };
};

export type DiscoverStepOutput = {
  stepId: string;
  type: StepType;
  inputs: {
    schema: JsonSchema;
    unknownSchema: Schema;
  };
  outputs: {
    schema: JsonSchema;
    unknownSchema: Schema;
  };
  results: {
    schema: JsonSchema;
    unknownSchema: Schema;
  };
  code: string;
  resolve: (inputs: any) => Awaitable<any>;
  providers: Array<DiscoverProviderOutput>;
  options: StepOptions;
};

export type DiscoverWorkflowOutput = {
  workflowId: string;
  execute: Execute<unknown, unknown>;
  options: WorkflowOptions<unknown, unknown>;
  code: string;
  steps: Array<DiscoverStepOutput>;
  data: {
    schema: JsonSchema;
    unknownSchema: Schema;
  };
  inputs: {
    schema: JsonSchema;
    unknownSchema: Schema;
  };
};

export type DiscoverOutput = {
  workflows: Array<DiscoverWorkflowOutput>;
};
