import { ActionStepEnum, ChannelStepEnum } from '../constants';
import {
  delayOutputSchema,
  delayResultSchema,
  digestOutputSchema,
  digestRegularOutputSchema,
  digestResultSchema,
  digestTimedOutputSchema,
} from '../schemas';
import { actionStepSchemas } from '../schemas/steps/actions';
import { channelStepSchemas } from '../schemas/steps/channels';
import type { Providers } from './provider.types';
import type { FromSchema, Schema } from './schema.types';
import type { Skip } from './skip.types';
import type { Awaitable } from './util.types';

// @TODO: remove the credentials, providers, and preferences from the ActionStepOptions (fix the client typings)
export type StepOptions = {
  skip?: Skip<any>;
  inputSchema?: Schema;
  controlSchema?: Schema;
  providers?: Record<string, (payload: any) => Awaitable<any>>;
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

type StepContext = {
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

type StepOutput<T_Result> = Promise<T_Result & StepContext>;

export type ActionStep<T_Outputs, T_Result> = <
  /**
   * The schema for the controls of the step.
   */
  T_ControlSchema extends Schema,
  /**
   * The controls for the step.
   */
  T_Controls = FromSchema<T_ControlSchema>
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
  options?: {
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
    // TODO: Remove the providers from the action step options
    providers?: Record<string, (payload: unknown) => Awaitable<unknown>>;
  }
) => StepOutput<T_Result>;

export type CustomStep = <
  /**
   * The schema for the controls of the step.
   */
  T_ControlSchema extends Schema,
  /**
   * The schema for the outputs of the step.
   */
  T_OutputsSchema extends Schema,
  /**
   * The controls for the step.
   */
  T_Controls = FromSchema<T_ControlSchema>,
  /**
   * The result for the step.
   */
  T_Intermediary = FromSchema<T_OutputsSchema>,
  T_Outputs extends T_Intermediary = T_Intermediary,
  T_Result extends T_Intermediary = T_Intermediary
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
  options?: {
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
    /**
     * The schema for the outputs of the step. Used to validate the output of the `resolve` function.
     */
    outputSchema?: T_OutputsSchema;
    /**
     * The providers for the step. Used to override the behaviour of the providers for the step.
     */
  }
) => Promise<T_Result & StepContext>;

export type ChannelStep<
  /**
   * The type of channel step.
   */
  T_StepType extends keyof typeof channelStepSchemas,
  /**
   * The outputs for the step.
   */
  T_Outputs,
  /**
   * The result for the step.
   */
  T_Result
> = <
  /**
   * The schema for the controls of the step.
   */
  T_ControlSchema extends Schema,
  /**
   * The controls for the step.
   */
  T_Controls = FromSchema<T_ControlSchema>
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
  options?: {
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
    /**
     * The providers for the step. Used to override the behaviour of the providers for the step.
     */
    providers?: Providers<T_StepType, T_Controls, T_Outputs>;
    /*
     * credentials?: (controls: T_Controls) => Promise<Record<string, unknown>>;
     * preferences?: (controls: T_Controls) => Promise<Record<string, unknown>>;
     */
  }
) => Promise<T_Result & StepContext>;

export type EmailOutput = FromSchema<(typeof channelStepSchemas)[ChannelStepEnum.EMAIL]['output']>;
export type EmailResult = FromSchema<(typeof channelStepSchemas)[ChannelStepEnum.EMAIL]['result']>;

export type SmsOutput = FromSchema<(typeof channelStepSchemas)[ChannelStepEnum.SMS]['output']>;
export type SmsResult = FromSchema<(typeof channelStepSchemas)[ChannelStepEnum.SMS]['result']>;

export type PushOutput = FromSchema<(typeof channelStepSchemas)[ChannelStepEnum.PUSH]['output']>;
export type PushResult = FromSchema<(typeof channelStepSchemas)[ChannelStepEnum.PUSH]['result']>;

export type ChatOutput = FromSchema<(typeof channelStepSchemas)[ChannelStepEnum.CHAT]['output']>;
export type ChatResult = FromSchema<(typeof channelStepSchemas)[ChannelStepEnum.CHAT]['result']>;

export type InAppOutput = FromSchema<(typeof channelStepSchemas)[ChannelStepEnum.IN_APP]['output']>;
export type InAppResult = FromSchema<(typeof channelStepSchemas)[ChannelStepEnum.IN_APP]['result']>;

export type DelayOutput = FromSchema<(typeof actionStepSchemas)[ActionStepEnum.DELAY]['output']>;
export type DelayResult = FromSchema<(typeof actionStepSchemas)[ActionStepEnum.DELAY]['result']>;

export type digestRegularOutput = FromSchema<typeof digestRegularOutputSchema>;
export type digestTimedOutput = FromSchema<typeof digestTimedOutputSchema>;

export type DigestOutput = FromSchema<(typeof actionStepSchemas)[ActionStepEnum.DIGEST]['output']>;
export type DigestResult = FromSchema<(typeof actionStepSchemas)[ActionStepEnum.DIGEST]['result']>;

/**
 * The step type.
 */
export type Step = {
  /** Send an email. */
  email: ChannelStep<ChannelStepEnum.EMAIL, EmailOutput, EmailResult>;
  /** Send an SMS. */
  sms: ChannelStep<ChannelStepEnum.SMS, SmsOutput, SmsResult>;
  /** Send a push notification. */
  push: ChannelStep<ChannelStepEnum.PUSH, PushOutput, PushResult>;
  /** Send a chat message. */
  chat: ChannelStep<ChannelStepEnum.CHAT, ChatOutput, ChatResult>;
  /** Send an in-app notification. */
  inApp: ChannelStep<ChannelStepEnum.IN_APP, InAppOutput, InAppResult>;
  /** Aggregate events for a period of time. */
  digest: ActionStep<FromSchema<typeof digestOutputSchema>, FromSchema<typeof digestResultSchema>>;
  /** Delay the workflow for a period of time. */
  delay: ActionStep<FromSchema<typeof delayOutputSchema>, FromSchema<typeof delayResultSchema>>;
  /** Execute custom code */
  custom: CustomStep;
};
