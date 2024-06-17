import Ajv, { Schema } from 'ajv';
import addFormats from 'ajv-formats';
import { FromSchema } from 'json-schema-to-ts';
import { ChannelStepEnum } from './constants';
import { StepAlreadyExistsError } from './errors';
import { channelStepSchemas, delayChannelSchemas, digestChannelSchemas, emptySchema, providerSchemas } from './schemas';
import {
  ActionStep,
  CustomStep,
  DiscoverStepOutput,
  DiscoverWorkflowOutput,
  Execute,
  StepType,
  WorkflowOptions,
} from './types';
import { EMOJI, log } from './utils';

/**
 * Define a new notification workflow.
 */
export function workflow<
  T_PayloadSchema extends Schema,
  T_InputSchema extends Schema,
  T_Payload = FromSchema<T_PayloadSchema>,
  T_Input = FromSchema<T_InputSchema>
>(
  workflowId: string,
  execute: Execute<T_Payload, T_Input>,
  workflowOptions?: WorkflowOptions<T_PayloadSchema, T_InputSchema>
): DiscoverWorkflowOutput {
  const options = workflowOptions ? workflowOptions : {};
  const ajv = new Ajv({ useDefaults: true });
  addFormats(ajv);

  const newWorkflow = {
    workflowId,
    options,
    steps: [],
    code: execute.toString(),
    data: {
      schema: options.payloadSchema || emptySchema,
      validate: ajv.compile(options.payloadSchema || emptySchema),
    },
    inputs: {
      schema: options.inputSchema || emptySchema,
      validate: ajv.compile(options.inputSchema || emptySchema),
    },
    execute,
  };

  execute({
    payload: {} as T_Payload,
    subscriber: {},
    environment: {},
    input: {} as T_Input,
    step: {
      ...Object.entries(channelStepSchemas).reduce((acc, [channel, schemas]) => {
        acc[channel] = discoverStepFactory(
          newWorkflow,
          channel as ChannelStepEnum,
          ajv,
          schemas.output,
          schemas.result
        );

        return acc;
      }, {} as Record<ChannelStepEnum, ActionStep<any, any>>),
      /*
       * Temporary workaround for inApp, which has snake_case step type
       * TODO: decouple step types from the channel step types
       */
      inApp: discoverStepFactory(
        newWorkflow,
        'in_app',
        ajv,
        channelStepSchemas.in_app.output,
        channelStepSchemas.in_app.result
      ),
      digest: discoverStepFactory(newWorkflow, 'digest', ajv, digestChannelSchemas.output, digestChannelSchemas.result),
      delay: discoverStepFactory(newWorkflow, 'delay', ajv, delayChannelSchemas.output, delayChannelSchemas.result),
      custom: discoverCustomStepFactory(newWorkflow, 'custom', ajv),
    },
  });

  prettyPrintDiscovery(newWorkflow);

  return newWorkflow;
}

function discoverStepFactory<T, U>(
  targetWorkflow: DiscoverWorkflowOutput,
  type: StepType,
  ajv: Ajv,
  outputSchema: Schema,
  resultSchema: Schema
): ActionStep<T, U> {
  return async (stepId, resolve, options = {}) => {
    const inputSchema = options?.inputSchema || emptySchema;

    const step = {
      stepId,
      type,
      inputs: {
        schema: inputSchema,
        validate: ajv.compile(inputSchema),
      },
      outputs: {
        schema: outputSchema,
        validate: ajv.compile(outputSchema),
      },
      results: {
        schema: resultSchema,
        validate: ajv.compile(resultSchema),
      },
      resolve,
      code: resolve.toString(),
      options,
      providers: [],
    };

    discoverStep(targetWorkflow, stepId, step);

    if (Object.keys(options.providers || {}).length > 0) {
      discoverProviders(step, ajv, type, options.providers || {});
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
  ajv: Ajv,
  channelType: string,
  providers: Record<string, (payload: unknown) => unknown | Promise<unknown>>
): void {
  const channelSchemas = providerSchemas[channelType];

  Object.entries(providers).forEach(([type, resolve]) => {
    const schemas = channelSchemas[type];
    step.providers.push({
      type,
      code: resolve.toString(),
      resolve,
      outputs: {
        schema: schemas.output,
        validate: ajv.compile(schemas.output),
      },
    });
  });
}

function discoverCustomStepFactory(targetWorkflow: DiscoverWorkflowOutput, type: StepType, ajv: Ajv): CustomStep {
  return async (stepId, resolve, options = {}) => {
    const inputSchema = options?.inputSchema || emptySchema;
    const outputSchema = options?.outputSchema || emptySchema;

    discoverStep(targetWorkflow, stepId, {
      stepId,
      type,
      inputs: {
        schema: inputSchema,
        validate: ajv.compile(inputSchema),
      },
      outputs: {
        schema: outputSchema,
        validate: ajv.compile(outputSchema),
      },
      results: {
        schema: outputSchema,
        validate: ajv.compile(outputSchema),
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
