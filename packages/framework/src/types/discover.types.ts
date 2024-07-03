import { ActionStepEnum, ChannelStepEnum } from '../constants';
import type { JsonSchema, Schema } from './schema.types';
import type { StepOptions } from './step.types';
import type { Execute, WorkflowOptions } from './workflow.types';
import type { Awaitable, Prettify } from './util.types';
import type { EventTriggerParams, EventTriggerResult } from './event.types';

export type StepType = `${ChannelStepEnum | ActionStepEnum}`;

export type DiscoverProviderOutput = {
  type: string;
  code: string;
  resolve: ({ controls, outputs }: { controls: unknown; outputs: unknown }) => Awaitable<unknown>;
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
  controls: {
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
  resolve: (controls: any) => Awaitable<any>;
  providers: Array<DiscoverProviderOutput>;
  options: StepOptions;
};

export type DiscoverWorkflowOutput = {
  workflowId: string;
  execute: Execute<unknown, unknown>;
  options: WorkflowOptions<unknown, unknown>;
  code: string;
  steps: Array<DiscoverStepOutput>;
  payload: {
    schema: JsonSchema;
    unknownSchema: Schema;
  };
  /** @deprecated */
  data: {
    schema: JsonSchema;
    unknownSchema: Schema;
  };
  /** @deprecated */
  inputs: {
    schema: JsonSchema;
    unknownSchema: Schema;
  };
  controls: {
    schema: JsonSchema;
    unknownSchema: Schema;
  };
};

export type Workflow<T_Payload = any> = {
  trigger: (
    event: Prettify<Omit<EventTriggerParams<T_Payload>, 'workflowId' | 'bridgeUrl' | 'controls'>>
  ) => Promise<EventTriggerResult>;
  definition: DiscoverWorkflowOutput;
};

export type DiscoverOutput = {
  workflows: Array<DiscoverWorkflowOutput>;
};
