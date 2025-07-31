import { ChannelStepEnum } from '../../constants';
import { emptySchema } from '../../schemas';
import type {
  Awaitable,
  ChannelStep,
  DiscoverStepOutput,
  DiscoverWorkflowOutput,
  FromSchema,
  Schema,
  StepOptions,
} from '../../types';
import { transformSchema } from '../../validators';
import { discoverProviders } from './discover-providers';
import { discoverStep } from './discover-step';

export async function discoverChannelStepFactory(
  targetWorkflow: DiscoverWorkflowOutput,
  type: ChannelStepEnum,
  outputSchema: Schema,
  resultSchema: Schema
): Promise<ChannelStep<ChannelStepEnum, any, any>> {
  return async (stepId, resolve, options = {}) => {
    const controlSchema = options?.controlSchema || emptySchema;

    const step: DiscoverStepOutput = {
      stepId,
      type,
      controls: {
        schema: await transformSchema(controlSchema),
        unknownSchema: controlSchema,
      },
      outputs: {
        schema: await transformSchema(outputSchema),
        unknownSchema: outputSchema,
      },
      results: {
        schema: await transformSchema(resultSchema),
        unknownSchema: resultSchema,
      },
      resolve: resolve as (controls: Record<string, unknown>) => Awaitable<Record<string, unknown>>,
      code: resolve.toString(),
      options: options as StepOptions<Schema, FromSchema<Schema>>,
      providers: [],
    };

    await discoverStep(targetWorkflow, stepId, step);

    if (Object.keys(options.providers || {}).length > 0) {
      await discoverProviders(step, type as ChannelStepEnum, options.providers || {});
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
