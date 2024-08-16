import { ActionStepEnum, ChannelStepEnum } from '../constants';
import { MissingSecretKeyError, StepAlreadyExistsError, WorkflowPayloadInvalidError } from '../errors';
import { channelStepSchemas, delayActionSchemas, digestActionSchemas, emptySchema, providerSchemas } from '../schemas';
import type {
  Awaitable,
  CancelEventTriggerResponse,
  CustomStep,
  DiscoverStepOutput,
  DiscoverWorkflowOutput,
  Execute,
  FromSchema,
  Schema,
  StepType,
  EventTriggerResponse,
  Workflow,
  WorkflowOptions,
  ChannelStep,
  ActionStep,
  StepOutput,
} from '../types';
import { WithPassthrough } from '../types/provider.types';
import { EMOJI, getBridgeUrl, initApiClient, log } from '../utils';
import { transformSchema, validateData } from '../validators';

/**
 * Define a new notification workflow.
 */
export function workflow<
  T_PayloadSchema extends Schema,
  T_ControlSchema extends Schema,
  T_Payload extends Record<string, unknown> = FromSchema<T_PayloadSchema>,
  T_Controls extends Record<string, unknown> = FromSchema<T_ControlSchema>
>(
  workflowId: string,
  execute: Execute<T_Payload, T_Controls>,
  workflowOptions?: WorkflowOptions<T_PayloadSchema, T_ControlSchema>
): Workflow<T_Payload> {
  const options = workflowOptions ? workflowOptions : {};

  const apiClient = initApiClient(process.env.NOVU_SECRET_KEY as string);

  const trigger: Workflow<T_Payload>['trigger'] = async (event) => {
    if (!process.env.NOVU_SECRET_KEY) {
      throw new MissingSecretKeyError();
    }

    let validatedData: T_Payload = event.payload;
    if (options.payloadSchema) {
      const validationResult = await validateData(options.payloadSchema, event.payload);
      if (validationResult.success === false) {
        throw new WorkflowPayloadInvalidError(workflowId, validationResult.errors);
      }
      validatedData = validationResult.data;
    }
    const bridgeUrl = await getBridgeUrl();

    const requestPayload = {
      name: workflowId,
      to: event.to,
      payload: {
        ...validatedData,
      },
      ...(event.transactionId && { transactionId: event.transactionId }),
      ...(event.overrides && { overrides: event.overrides }),
      ...(event.actor && { actor: event.actor }),
      ...(event.tenant && { tenant: event.tenant }),
      ...(bridgeUrl && { bridgeUrl }),
    };

    const result = await apiClient.post<EventTriggerResponse>('/events/trigger', requestPayload);

    const cancel = async () => {
      return apiClient.delete<CancelEventTriggerResponse>(`/events/trigger/${result.transactionId}`);
    };

    return {
      cancel,
      data: result,
    };
  };

  const newWorkflow: DiscoverWorkflowOutput = {
    workflowId,
    options: {
      ...options,
      /*
       * TODO: Transformation added for backwards compatibility, remove this additional transform after we
       * start using `data.schema` and `control.schema` in UI.
       */
      inputSchema: transformSchema(options.controlSchema || options.inputSchema || emptySchema),
      controlSchema: transformSchema(options.controlSchema || options.inputSchema || emptySchema),
      payloadSchema: transformSchema(options.payloadSchema || emptySchema),
    },
    steps: [],
    code: execute.toString(),
    /** @deprecated */
    data: {
      schema: transformSchema(options.payloadSchema || emptySchema),
      unknownSchema: options.payloadSchema || emptySchema,
    },
    payload: {
      schema: transformSchema(options.payloadSchema || emptySchema),
      unknownSchema: options.payloadSchema || emptySchema,
    },
    /** @deprecated */
    inputs: {
      schema: transformSchema(options.controlSchema || options.inputSchema || emptySchema),
      unknownSchema: options.controlSchema || options.inputSchema || emptySchema,
    },
    controls: {
      schema: transformSchema(options.controlSchema || options.inputSchema || emptySchema),
      unknownSchema: options.controlSchema || options.inputSchema || emptySchema,
    },
    tags: options.tags || [],
    execute: execute as Execute<Record<string, unknown>, Record<string, unknown>>,
  };

  execute({
    payload: {} as T_Payload,
    subscriber: {},
    environment: {},
    controls: {} as T_Controls,
    input: {} as T_Controls,
    step: {
      push: discoverChannelStepFactory(
        newWorkflow,
        ChannelStepEnum.PUSH,
        channelStepSchemas.push.output,
        channelStepSchemas.push.result
      ),
      chat: discoverChannelStepFactory(
        newWorkflow,
        ChannelStepEnum.CHAT,
        channelStepSchemas.chat.output,
        channelStepSchemas.chat.result
      ),
      email: discoverChannelStepFactory(
        newWorkflow,
        ChannelStepEnum.EMAIL,
        channelStepSchemas.email.output,
        channelStepSchemas.email.result
      ),
      sms: discoverChannelStepFactory(
        newWorkflow,
        ChannelStepEnum.SMS,
        channelStepSchemas.sms.output,
        channelStepSchemas.sms.result
      ),
      inApp: discoverChannelStepFactory(
        newWorkflow,
        ChannelStepEnum.IN_APP,
        channelStepSchemas.in_app.output,
        channelStepSchemas.in_app.result
      ),
      digest: discoverActionStepFactory(
        newWorkflow,
        ActionStepEnum.DIGEST,
        digestActionSchemas.output,
        digestActionSchemas.result
      ),
      delay: discoverActionStepFactory(
        newWorkflow,
        ActionStepEnum.DELAY,
        delayActionSchemas.output,
        delayActionSchemas.result
      ),
      custom: discoverCustomStepFactory(newWorkflow, ActionStepEnum.CUSTOM),
    } as never,
    // eslint-disable-next-line promise/always-return
  }).then(() => {
    prettyPrintDiscovery(newWorkflow);
  });

  return {
    trigger,
    definition: newWorkflow,
  };
}

function discoverChannelStepFactory(
  targetWorkflow: DiscoverWorkflowOutput,
  type: ChannelStepEnum,
  outputSchema: Schema,
  resultSchema: Schema
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): ChannelStep<ChannelStepEnum, any, any> {
  return async (stepId, resolve, options = {}) => {
    const controlSchema = options?.controlSchema || options?.inputSchema || emptySchema;

    const step: DiscoverStepOutput = {
      stepId,
      type,
      inputs: {
        schema: transformSchema(controlSchema),
        unknownSchema: controlSchema,
      },
      controls: {
        schema: transformSchema(controlSchema),
        unknownSchema: controlSchema,
      },
      outputs: {
        schema: transformSchema(outputSchema),
        unknownSchema: outputSchema,
      },
      results: {
        schema: transformSchema(resultSchema),
        unknownSchema: resultSchema,
      },
      resolve: resolve as (controls: Record<string, unknown>) => Awaitable<Record<string, unknown>>,
      code: resolve.toString(),
      options,
      providers: [],
    };

    discoverStep(targetWorkflow, stepId, step);

    if (Object.keys(options.providers || {}).length > 0) {
      discoverProviders(step, type as ChannelStepEnum, options.providers || {});
    }

    return {
      _ctx: {
        timestamp: Date.now(),
        state: {
          status: 'pending',
          error: false,
        },
      },
    };
  };
}

function discoverActionStepFactory(
  targetWorkflow: DiscoverWorkflowOutput,
  type: ActionStepEnum,
  outputSchema: Schema,
  resultSchema: Schema
  // TODO: fix typing for `resolve` to use generic typings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): ActionStep<any, any> {
  return async (stepId, resolve, options = {}) => {
    const controlSchema = options?.controlSchema || options?.inputSchema || emptySchema;

    discoverStep(targetWorkflow, stepId, {
      stepId,
      type,
      inputs: {
        schema: transformSchema(controlSchema),
        unknownSchema: controlSchema,
      },
      controls: {
        schema: transformSchema(controlSchema),
        unknownSchema: controlSchema,
      },
      outputs: {
        schema: transformSchema(outputSchema),
        unknownSchema: outputSchema,
      },
      results: {
        schema: transformSchema(resultSchema),
        unknownSchema: resultSchema,
      },
      resolve: resolve as (controls: Record<string, unknown>) => Awaitable<Record<string, unknown>>,
      code: resolve.toString(),
      options,
      providers: [],
    });

    return {
      _ctx: {
        timestamp: Date.now(),
        state: {
          status: 'pending',
          error: false,
        },
      },
    };
  };
}

function discoverStep(targetWorkflow: DiscoverWorkflowOutput, stepId: string, step: DiscoverStepOutput): void {
  if (targetWorkflow.steps.some((workflowStep) => workflowStep.stepId === stepId)) {
    throw new StepAlreadyExistsError(stepId);
  } else {
    targetWorkflow.steps.push(step);
  }
}

function discoverProviders(
  step: DiscoverStepOutput,
  channelType: ChannelStepEnum,
  providers: Record<
    string,
    ({
      controls,
      outputs,
    }: {
      controls: Record<string, unknown>;
      outputs: Record<string, unknown>;
    }) => Awaitable<WithPassthrough<Record<string, unknown>>>
  >
): void {
  const channelSchemas = providerSchemas[channelType];

  Object.entries(providers).forEach(([type, resolve]) => {
    // eslint-disable-next-line multiline-comment-style
    // TODO: fix the typing for `type` to use the keyof providerSchema[channelType]
    // @ts-expect-error - Element implicitly has an 'any' type because expression of type 'string' can't be used to index type
    const schemas = channelSchemas[type];
    step.providers.push({
      type,
      code: resolve.toString(),
      resolve,
      outputs: {
        schema: transformSchema(schemas.output),
        unknownSchema: schemas.output,
      },
    });
  });
}

function discoverCustomStepFactory(targetWorkflow: DiscoverWorkflowOutput, type: StepType): CustomStep {
  return async (stepId, resolve, options = {}) => {
    const controlSchema = options?.controlSchema || options?.inputSchema || emptySchema;
    const outputSchema = options?.outputSchema || emptySchema;

    discoverStep(targetWorkflow, stepId, {
      stepId,
      type,
      inputs: {
        schema: transformSchema(controlSchema),
        unknownSchema: controlSchema,
      },
      controls: {
        schema: transformSchema(controlSchema),
        unknownSchema: controlSchema,
      },
      outputs: {
        schema: transformSchema(outputSchema),
        unknownSchema: outputSchema,
      },
      results: {
        schema: transformSchema(outputSchema),
        unknownSchema: outputSchema,
      },
      resolve: resolve as (controls: Record<string, unknown>) => Awaitable<Record<string, unknown>>,
      code: resolve.toString(),
      options,
      providers: [],
    });

    return {
      _ctx: {
        timestamp: Date.now(),
        state: {
          status: 'pending',
          error: false,
        },
      },
      // TODO: fix typing for `resolve` to use generic typings
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as Awaited<StepOutput<any>>;
  };
}

function prettyPrintDiscovery(discoveredWorkflow: DiscoverWorkflowOutput): void {
  // eslint-disable-next-line no-console
  console.log(`\n${log.bold(log.underline('Discovered workflowId:'))} '${discoveredWorkflow.workflowId}'`);
  discoveredWorkflow.steps.forEach((step, i) => {
    const isLastStep = i === discoveredWorkflow.steps.length - 1;
    const prefix = isLastStep ? '└' : '├';
    // eslint-disable-next-line no-console
    console.log(`${prefix} ${EMOJI.STEP} Discovered stepId: '${step.stepId}'\tType: '${step.type}'`);
    step.providers.forEach((provider, providerIndex) => {
      const isLastProvider = providerIndex === step.providers.length - 1;
      const stepPrefix = isLastStep ? ' ' : '│';
      const providerPrefix = isLastProvider ? '└' : '├';
      // eslint-disable-next-line no-console
      console.log(`${stepPrefix} ${providerPrefix} ${EMOJI.PROVIDER} Discovered provider: '${provider.type}'`);
    });
  });
}
