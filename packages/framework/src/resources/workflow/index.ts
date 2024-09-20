import { ActionStepEnum, ChannelStepEnum } from '../../constants';
import { MissingSecretKeyError, WorkflowPayloadInvalidError } from '../../errors';
import { channelStepSchemas, delayActionSchemas, digestActionSchemas, emptySchema } from '../../schemas';
import type {
  CancelEventTriggerResponse,
  DiscoverWorkflowOutput,
  Execute,
  FromSchema,
  Schema,
  EventTriggerResponse,
  Workflow,
  WorkflowOptions,
  FromSchemaUnvalidated,
} from '../../types';
import { getBridgeUrl, initApiClient } from '../../utils';
import { transformSchema, validateData } from '../../validators';
import { discoverActionStepFactory } from './discover-action-step-factory';
import { discoverChannelStepFactory } from './discover-channel-step-factory';
import { discoverCustomStepFactory } from './discover-custom-step-factory';
import { mapPreferences } from './map-preferences';
import { prettyPrintDiscovery } from './pretty-print-discovery';

/**
 * Define a new notification workflow.
 */
export function workflow<
  T_PayloadSchema extends Schema,
  T_ControlSchema extends Schema,
  T_PayloadValidated extends Record<string, unknown> = FromSchema<T_PayloadSchema>,
  T_PayloadUnvalidated extends Record<string, unknown> = FromSchemaUnvalidated<T_PayloadSchema>,
  T_Controls extends Record<string, unknown> = FromSchema<T_ControlSchema>,
>(
  workflowId: string,
  execute: Execute<T_PayloadValidated, T_Controls>,
  workflowOptions?: WorkflowOptions<T_PayloadSchema, T_ControlSchema>
): Workflow<T_PayloadUnvalidated> {
  const options = workflowOptions || {};

  const apiClient = initApiClient(process.env.NOVU_SECRET_KEY as string);

  const trigger: Workflow<T_PayloadUnvalidated>['trigger'] = async (event) => {
    if (!process.env.NOVU_SECRET_KEY) {
      throw new MissingSecretKeyError();
    }

    const unvalidatedData = (event.payload || {}) as T_PayloadUnvalidated;
    let validatedData: T_PayloadValidated;
    if (options.payloadSchema) {
      const validationResult = await validateData(options.payloadSchema, unvalidatedData);
      if (validationResult.success === false) {
        throw new WorkflowPayloadInvalidError(workflowId, validationResult.errors);
      }
      validatedData = validationResult.data;
    } else {
      // This type coercion provides support to trigger Workflows without a payload schema
      validatedData = event.payload as unknown as T_PayloadValidated;
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
    preferences: mapPreferences(options.preferences),
    execute: execute as Execute<Record<string, unknown>, Record<string, unknown>>,
  };

  execute({
    payload: {} as T_PayloadValidated,
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
  }).then(() => {
    prettyPrintDiscovery(newWorkflow);
  });

  return {
    trigger,
    definition: newWorkflow,
  };
}
