import { ChannelStepEnum } from './constants';
import { MissingSecretKeyError, StepAlreadyExistsError, WorkflowPayloadInvalidError } from './errors';
import { channelStepSchemas, delayChannelSchemas, digestChannelSchemas, emptySchema, providerSchemas } from './schemas';
import type {
  ActionStep,
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
} from './types';
import { EMOJI, getBridgeUrl, initApiClient, log } from './utils';
import { transformSchema, validateData } from './validators';

/**
 * Define a new notification workflow.
 */
export function workflow<
  T_PayloadSchema extends Schema,
  T_ControlSchema extends Schema,
  T_Payload = FromSchema<T_PayloadSchema>,
  T_Control = FromSchema<T_ControlSchema>
>(
  workflowId: string,
  execute: Execute<T_Payload, T_Control>,
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
        ...event?.payload,
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
    execute: execute as Execute<any, any>,
  };

  execute({
    payload: {} as T_Payload,
    subscriber: {},
    environment: {},
    controls: {} as T_Control,
    step: {
      push: discoverStepFactory(newWorkflow, 'push', channelStepSchemas.push.output, channelStepSchemas.push.result),
      // eslint-disable-next-line multiline-comment-style
      // TODO: fix the typing for `type` to use the keyof providerSchema[channelType]
      // @ts-expect-error - Types of parameters 'options' and 'options' are incompatible.
      chat: discoverStepFactory(newWorkflow, 'chat', channelStepSchemas.chat.output, channelStepSchemas.chat.result),
      // eslint-disable-next-line multiline-comment-style
      // TODO: fix the typing for `type` to use the keyof providerSchema[channelType]
      // @ts-expect-error - Types of parameters 'options' and 'options' are incompatible.
      email: discoverStepFactory(
        newWorkflow,
        'email',
        channelStepSchemas.email.output,
        channelStepSchemas.email.result
      ),
      sms: discoverStepFactory(newWorkflow, 'sms', channelStepSchemas.sms.output, channelStepSchemas.sms.result),
      inApp: discoverStepFactory(
        newWorkflow,
        'in_app',
        channelStepSchemas.in_app.output,
        channelStepSchemas.in_app.result
      ),
      digest: discoverStepFactory(newWorkflow, 'digest', digestChannelSchemas.output, digestChannelSchemas.result),
      delay: discoverStepFactory(newWorkflow, 'delay', delayChannelSchemas.output, delayChannelSchemas.result),
      custom: discoverCustomStepFactory(newWorkflow, 'custom'),
    },
  });

  prettyPrintDiscovery(newWorkflow);

  return {
    trigger,
    definition: newWorkflow,
  };
}

function discoverStepFactory<T, U>(
  targetWorkflow: DiscoverWorkflowOutput,
  type: StepType,
  outputSchema: Schema,
  resultSchema: Schema
): ActionStep<T, U> {
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
      resolve,
      code: resolve.toString(),
      options,
      providers: [],
    };

    discoverStep(targetWorkflow, stepId, step);

    if (
      Object.values(ChannelStepEnum).includes(type as ChannelStepEnum) &&
      Object.keys(options.providers || {}).length > 0
    ) {
      discoverProviders(step, type as ChannelStepEnum, options.providers || {});
    }

    return undefined as any;
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
  providers: Record<string, (payload: unknown) => Awaitable<unknown>>
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
      resolve,
      code: resolve.toString(),
      options,
      providers: [],
    });

    return undefined as any;
  };
}

function prettyPrintDiscovery(discoveredWorkflow: DiscoverWorkflowOutput): void {
  // eslint-disable-next-line no-console
  console.log(`\n${log.bold(log.underline('Discovered workflowId:'))} '${discoveredWorkflow.workflowId}'`);
  discoveredWorkflow.steps.forEach((step, i) => {
    const prefix = i === discoveredWorkflow.steps.length - 1 ? '└' : '├';
    // eslint-disable-next-line no-console
    console.log(`${prefix} ${EMOJI.STEP} Discovered stepId: '${step.stepId}'\tType: '${step.type}'`);
    step.providers.forEach((provider, providerIndex) => {
      const providerPrefix = providerIndex === step.providers.length - 1 ? '└' : '├';
      // eslint-disable-next-line no-console
      console.log(`  ${providerPrefix} ${EMOJI.PROVIDER} Discovered provider: '${provider.type}'`);
    });
  });
}
