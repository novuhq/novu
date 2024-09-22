import { ActionStepEnum, ChannelStepEnum } from '../constants';
import { actionStepSchemas } from '../schemas/steps/actions';
import { digestRegularOutputSchema, digestTimedOutputSchema } from '../schemas/steps/actions/digest.schema';
import { channelStepSchemas } from '../schemas/steps/channels';
import type { Providers } from './provider.types';
import type { FromSchema, FromSchemaUnvalidated, Schema } from './schema.types';
import type { Skip } from './skip.types';
import type { Awaitable, Prettify } from './util.types';
import { WorkflowChannelEnum } from '../constants/workflow.constants';

export type StepOptions<
  T_ControlSchema extends Schema = Schema,
  T_Controls extends Record<string, unknown> = FromSchema<T_ControlSchema>,
> = {
  /**
   * Skip the step. If the skip function returns true, the step will be skipped.
   *
   * @param controls The controls for the step.
   */
  skip?: Skip<T_Controls>;
  /**
   * The schema for the controls of the step. Used to validate the user-provided controls from Novu Web.
   *
   * @deprecated Use `controlSchema` instead
   */
  inputSchema?: T_ControlSchema;
  /**
   * The schema for the controls of the step. Used to validate the user-provided controls from Novu Web.
   */
  controlSchema?: T_ControlSchema;
};

export enum JobStatusEnum {
  PENDING = 'pending',
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  CANCELED = 'canceled',
  MERGED = 'merged',
  SKIPPED = 'skipped',
}

export type StepContext = {
  /** The context of the step. */
  _ctx: {
    /** The timestamp of the step. */
    timestamp: number;
    /** The state of the step. */
    state: {
      /** The status of the step. */
      status: `${JobStatusEnum}`;
      /** A boolean flag to indicate if the step has errored. */
      error: boolean;
    };
  };
};

export type StepOutput<T_Result> = Promise<T_Result & StepContext>;

export type ActionStep<
  T_Outputs extends Record<string, unknown> = Record<string, unknown>,
  T_Result extends Record<string, unknown> = Record<string, unknown>,
> = <
  /**
   * The schema for the controls of the step.
   */
  T_ControlSchema extends Schema,
  /**
   * The controls for the step.
   */
  T_Controls extends Record<string, unknown> = FromSchema<T_ControlSchema>,
>(
  /**
   * The name of the step. This is used to identify the step in the workflow.
   */
  name: string,
  /**
   * The function to resolve the step notification content for the step.
   *
   * @param controls The controls for the step.
   */
  resolve: (controls: T_Controls) => Awaitable<T_Outputs>,
  /**
   * The options for the step.
   */
  options?: StepOptions<T_ControlSchema, T_Controls>
) => StepOutput<T_Result>;

export type CustomStep = <
  /**
   * The schema for the controls of the step.
   */
  T_ControlSchema extends Schema = Schema,
  /**
   * The schema for the outputs of the step.
   */
  T_OutputsSchema extends Schema = Schema,
  /**
   * The controls for the step.
   */
  T_Controls extends Record<string, unknown> = FromSchema<T_ControlSchema>,
  /*
   * These intermediary types are needed to capture the types in a single type instance
   * to stop Typescript from erroring with:
   * `Type instantiation is excessively deep and possibly infinite.`
   */
  T_IntermediaryResult extends Record<string, unknown> = FromSchema<T_OutputsSchema>,
  T_IntermediaryOutput extends Record<string, unknown> = FromSchemaUnvalidated<T_OutputsSchema>,
  /**
   * The output for the step.
   */
  T_Outputs extends T_IntermediaryOutput = T_IntermediaryOutput,
  /**
   * The result for the step.
   */
  T_Result extends T_IntermediaryResult = T_IntermediaryResult,
>(
  /**
   * The name of the step. This is used to identify the step in the workflow.
   */
  name: string,
  /**
   * The function to resolve the custom data for the step.
   *
   * @param controls The controls for the step.
   */
  resolve: (controls: T_Controls) => Awaitable<T_Outputs>,
  /**
   * The options for the step.
   */
  options?: StepOptions<T_ControlSchema, T_Controls> & {
    /**
     * The schema for the outputs of the step. Used to validate the output of the `resolve` function.
     */
    outputSchema?: T_OutputsSchema;
  }
) => StepOutput<T_Result>;

export type ChannelStep<
  /**
   * The type of channel step.
   */
  T_StepType extends keyof typeof channelStepSchemas = keyof typeof channelStepSchemas,
  /**
   * The outputs for the step.
   */
  T_Outputs extends Record<string, unknown> = Record<string, unknown>,
  /**
   * The result for the step.
   */
  T_Result extends Record<string, unknown> = Record<string, unknown>,
> = <
  /**
   * The schema for the controls of the step.
   */
  T_ControlSchema extends Schema,
  /**
   * The controls for the step.
   */
  T_Controls extends Record<string, unknown> = FromSchema<T_ControlSchema>,
>(
  /**
   * The name of the step. This is used to identify the step in the workflow.
   */
  name: string,
  /**
   * The function to resolve the step notification content for the step.
   *
   * @param controls The controls for the step.
   */
  resolve: (controls: T_Controls) => Awaitable<T_Outputs>,
  /**
   * The options for the step.
   */
  options?: StepOptions<T_ControlSchema, T_Controls> & {
    /**
     * The providers for the step. Used to override the behaviour of the providers for the step.
     */
    providers?: Prettify<Providers<T_StepType, T_Controls, T_Outputs>>;
  }
) => StepOutput<T_Result>;

export type EmailOutput = FromSchema<(typeof channelStepSchemas)[ChannelStepEnum.EMAIL]['output']>;
export type EmailOutputUnvalidated = FromSchemaUnvalidated<
  (typeof channelStepSchemas)[ChannelStepEnum.EMAIL]['output']
>;
export type EmailResult = FromSchema<(typeof channelStepSchemas)[ChannelStepEnum.EMAIL]['result']>;

export type SmsOutput = FromSchema<(typeof channelStepSchemas)[ChannelStepEnum.SMS]['output']>;
export type SmsOutputUnvalidated = FromSchemaUnvalidated<(typeof channelStepSchemas)[ChannelStepEnum.SMS]['output']>;
export type SmsResult = FromSchema<(typeof channelStepSchemas)[ChannelStepEnum.SMS]['result']>;

export type PushOutput = FromSchema<(typeof channelStepSchemas)[ChannelStepEnum.PUSH]['output']>;
export type PushOutputUnvalidated = FromSchemaUnvalidated<(typeof channelStepSchemas)[ChannelStepEnum.PUSH]['output']>;
export type PushResult = FromSchema<(typeof channelStepSchemas)[ChannelStepEnum.PUSH]['result']>;

export type ChatOutput = FromSchema<(typeof channelStepSchemas)[ChannelStepEnum.CHAT]['output']>;
export type ChatOutputUnvalidated = FromSchemaUnvalidated<(typeof channelStepSchemas)[ChannelStepEnum.CHAT]['output']>;
export type ChatResult = FromSchema<(typeof channelStepSchemas)[ChannelStepEnum.CHAT]['result']>;

export type InAppOutput = FromSchema<(typeof channelStepSchemas)[ChannelStepEnum.IN_APP]['output']>;
export type InAppOutputUnvalidated = FromSchemaUnvalidated<
  (typeof channelStepSchemas)[ChannelStepEnum.IN_APP]['output']
>;
export type InAppResult = FromSchema<(typeof channelStepSchemas)[ChannelStepEnum.IN_APP]['result']>;

export type DelayOutput = FromSchema<(typeof actionStepSchemas)[ActionStepEnum.DELAY]['output']>;
export type DelayOutputUnvalidated = FromSchemaUnvalidated<(typeof actionStepSchemas)[ActionStepEnum.DELAY]['output']>;
export type DelayResult = FromSchema<(typeof actionStepSchemas)[ActionStepEnum.DELAY]['result']>;

export type DigestRegularOutput = FromSchema<typeof digestRegularOutputSchema>;
export type DigestRegularOutputUnvalidated = FromSchemaUnvalidated<typeof digestRegularOutputSchema>;
export type DigestTimedOutput = FromSchema<typeof digestTimedOutputSchema>;
export type DigestTimedOutputUnvalidated = FromSchemaUnvalidated<typeof digestTimedOutputSchema>;

export type DigestOutput = FromSchema<(typeof actionStepSchemas)[ActionStepEnum.DIGEST]['output']>;
export type DigestOutputUnvalidated = FromSchemaUnvalidated<
  (typeof actionStepSchemas)[ActionStepEnum.DIGEST]['output']
>;
export type DigestResult = FromSchema<(typeof actionStepSchemas)[ActionStepEnum.DIGEST]['result']>;

/**
 * The step type.
 */
export type Step = {
  /** Send an email. */
  [WorkflowChannelEnum.EMAIL]: ChannelStep<ChannelStepEnum.EMAIL, EmailOutputUnvalidated, EmailResult>;
  /** Send an SMS. */
  [WorkflowChannelEnum.SMS]: ChannelStep<ChannelStepEnum.SMS, SmsOutputUnvalidated, SmsResult>;
  /** Send a push notification. */
  [WorkflowChannelEnum.PUSH]: ChannelStep<ChannelStepEnum.PUSH, PushOutputUnvalidated, PushResult>;
  /** Send a chat message. */
  [WorkflowChannelEnum.CHAT]: ChannelStep<ChannelStepEnum.CHAT, ChatOutputUnvalidated, ChatResult>;
  /** Send an in-app notification. */
  [WorkflowChannelEnum.IN_APP]: ChannelStep<ChannelStepEnum.IN_APP, InAppOutputUnvalidated, InAppResult>;
  /** Aggregate events for a period of time. */
  digest: ActionStep<DigestOutputUnvalidated, DigestResult>;
  /** Delay the workflow for a period of time. */
  delay: ActionStep<DelayOutputUnvalidated, DelayResult>;
  /** Execute custom code */
  custom: CustomStep;
};
