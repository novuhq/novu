import { ActionStepEnum, ChannelStepEnum } from '../../constants';
import { WorkflowPayloadInvalidError } from '../../errors';
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
import { getBridgeUrl, initApiClient, resolveApiUrl, resolveSecretKey } from '../../utils';
import { transformSchema, validateData } from '../../validators';
import { discoverActionStepFactory } from './discover-action-step-factory';
import { discoverChannelStepFactory } from './discover-channel-step-factory';
import { discoverCustomStepFactory } from './discover-custom-step-factory';
import { mapPreferences } from './map-preferences';

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

  const trigger: Workflow<T_PayloadUnvalidated>['trigger'] = async (event) => {
    const apiClient = initApiClient(resolveSecretKey(event.secretKey), resolveApiUrl(event.apiUrl));

    const unvalidatedData = (event.payload || {}) as T_PayloadUnvalidated;
    let validatedData: T_PayloadValidated;
    if (options.payloadSchema) {
      const validationResult = await validateData(options.payloadSchema, unvalidatedData);
      if (validationResult.success === false) {
        throw new WorkflowPayloadInvalidError(workflowId, validationResult.errors);
      }
      validatedData = validationResult.data as T_PayloadValidated;
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

  const discover = async (): Promise<DiscoverWorkflowOutput> => {
    const newWorkflow: DiscoverWorkflowOutput = {
      workflowId,
      steps: [],
      code: execute.toString(),
      payload: {
        schema: await transformSchema(options.payloadSchema || emptySchema),
        unknownSchema: options.payloadSchema || emptySchema,
      },
      controls: {
        schema: await transformSchema(options.controlSchema || emptySchema),
        unknownSchema: options.controlSchema || emptySchema,
      },
      tags: options.tags || [],
      preferences: mapPreferences(options.preferences),
      name: options.name,
      description: options.description,
      execute: execute as Execute<Record<string, unknown>, Record<string, unknown>>,
    };

    await execute({
      payload: {} as T_PayloadValidated,
      subscriber: {},
      environment: {},
      controls: {} as T_Controls,
      step: {
        push: await discoverChannelStepFactory(
          newWorkflow,
          ChannelStepEnum.PUSH,
          channelStepSchemas.push.output,
          channelStepSchemas.push.result
        ),
        chat: await discoverChannelStepFactory(
          newWorkflow,
          ChannelStepEnum.CHAT,
          channelStepSchemas.chat.output,
          channelStepSchemas.chat.result
        ),
        email: await discoverChannelStepFactory(
          newWorkflow,
          ChannelStepEnum.EMAIL,
          channelStepSchemas.email.output,
          channelStepSchemas.email.result
        ),
        sms: await discoverChannelStepFactory(
          newWorkflow,
          ChannelStepEnum.SMS,
          channelStepSchemas.sms.output,
          channelStepSchemas.sms.result
        ),
        inApp: await discoverChannelStepFactory(
          newWorkflow,
          ChannelStepEnum.IN_APP,
          channelStepSchemas.in_app.output,
          channelStepSchemas.in_app.result
        ),
        digest: await discoverActionStepFactory(
          newWorkflow,
          ActionStepEnum.DIGEST,
          digestActionSchemas.output,
          digestActionSchemas.result
        ),
        delay: await discoverActionStepFactory(
          newWorkflow,
          ActionStepEnum.DELAY,
          delayActionSchemas.output,
          delayActionSchemas.result
        ),
        custom: await discoverCustomStepFactory(newWorkflow, ActionStepEnum.CUSTOM),
      } as never,
    });

    return newWorkflow;
  };

  return {
    id: workflowId,
    trigger,
    discover,
  };
}
