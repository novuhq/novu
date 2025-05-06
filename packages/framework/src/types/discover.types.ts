import type { WorkflowPreferencesPartial } from '../shared';
import { ActionStepEnum, ChannelStepEnum } from '../constants';
import type { JsonSchema, Schema } from './schema.types';
import type { StepOptions } from './step.types';
import type { Execute } from './workflow.types';
import type { Awaitable, Prettify } from './util.types';
import type { EventTriggerParams, EventTriggerResult } from './event.types';
import type { WithPassthrough } from './provider.types';

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

export type DiscoverWorkflowOutput = {
  workflowId: string;
  execute: Execute<Record<string, unknown>, Record<string, unknown>>;
  code: string;
  steps: Array<DiscoverStepOutput>;
  payload: {
    schema: JsonSchema;
    unknownSchema: Schema;
  };
  controls: {
    schema: JsonSchema;
    unknownSchema: Schema;
  };
  preferences: WorkflowPreferencesPartial;
  tags: string[];
  name?: string;
  description?: string;
};

/**
 * A workflow resource.
 *
 * @property `id` - The unique identifier for the workflow.
 * @property `trigger` - The function to trigger the workflow.
 * @property `discover` - The function to discover the workflow definition.
 */
export type Workflow<T_Payload = never> = {
  /**
   * The unique identifier for the workflow.
   */
  id: string;
  /**
   * Trigger an event for this workflow with a strongly typed and validated `payload`, derived from the `payloadSchema`.
   *
   * @param event - The event to trigger
   * @returns `EventTriggerResult` - The result of the event trigger
   */
  trigger: (
    event: Prettify<Omit<EventTriggerParams<T_Payload>, 'workflowId' | 'bridgeUrl' | 'controls'>>
  ) => Promise<EventTriggerResult>;
  /**
   * Discover the workflow definition.
   *
   * @returns `DiscoverWorkflowOutput` - The workflow definition
   */
  discover: () => Promise<DiscoverWorkflowOutput>;
};

export type DiscoverOutput = {
  workflows: Array<DiscoverWorkflowOutput>;
};
