import { ActionStepEnum } from '../../constants';
import { emptySchema } from '../../schemas';
import type { Awaitable, DiscoverWorkflowOutput, Schema, ActionStep } from '../../types';
import { transformSchema } from '../../validators';
import { discoverStep } from './discover-step';

export function discoverActionStepFactory(
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
