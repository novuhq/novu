import { ChannelStepEnum } from '../../constants';
import { emptySchema } from '../../schemas';
import type { Awaitable, DiscoverStepOutput, DiscoverWorkflowOutput, Schema, ChannelStep } from '../../types';
import { transformSchema } from '../../validators';
import { discoverProviders } from './discover-providers';
import { discoverStep } from './discover-step';

export function discoverChannelStepFactory(
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
