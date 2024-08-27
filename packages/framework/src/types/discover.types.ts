import { ActionStepEnum, ChannelStepEnum } from '../constants';
import type { JsonSchema, Schema } from './schema.types';
import type { StepOptions } from './step.types';
import type { Execute, WorkflowOptions } from './workflow.types';
import type { Awaitable, Prettify } from './util.types';
import type { EventTriggerParams, EventTriggerResult } from './event.types';
import type { WithPassthrough } from './provider.types';
import { ChannelTypeEnum } from '@novu/shared';

export type StepType = `${ChannelStepEnum | ActionStepEnum}`;

export type DiscoverProviderOutput = {
  type: string;
  code: string;
  resolve: ({
    controls,
    outputs,
  }: {
    controls: Record<string, unknown>;
    outputs: Record<string, unknown>;
  }) => Awaitable<WithPassthrough<Record<string, unknown>>>;
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
  resolve: (controls: Record<string, unknown>) => Awaitable<Record<string, unknown>>;
  providers: Array<DiscoverProviderOutput>;
  options: StepOptions;
};

export type ChannelPreference = {
  defaultValue: boolean;
  readOnly: boolean;
};

export type DiscoverWorkflowOutputPreference = {
  workflow: ChannelPreference;
  channels: {
    [key in (typeof ChannelTypeEnum)[keyof typeof ChannelTypeEnum]]: ChannelPreference;
  };
};

export type DiscoverWorkflowOutput = {
  workflowId: string;
  execute: Execute<Record<string, unknown>, Record<string, unknown>>;
  options: WorkflowOptions<Schema, Schema>;
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
  preference: DiscoverWorkflowOutputPreference;
  tags: string[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Workflow<T_Payload = any> = {
  trigger: (
    event: Prettify<Omit<EventTriggerParams<T_Payload>, 'workflowId' | 'bridgeUrl' | 'controls'>>
  ) => Promise<EventTriggerResult>;
  definition: DiscoverWorkflowOutput;
};

export type DiscoverOutput = {
  workflows: Array<DiscoverWorkflowOutput>;
};
