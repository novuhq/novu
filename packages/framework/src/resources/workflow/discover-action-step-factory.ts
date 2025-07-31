import { ActionStepEnum } from '../../constants';
import { emptySchema } from '../../schemas';
import type { ActionStep, Awaitable, DiscoverWorkflowOutput, FromSchema, Schema, StepOptions } from '../../types';
import { transformSchema } from '../../validators';
import { discoverStep } from './discover-step';

export async function discoverActionStepFactory(
  targetWorkflow: DiscoverWorkflowOutput,
  type: ActionStepEnum,
  outputSchema: Schema,
  resultSchema: Schema
  // TODO: fix typing for `resolve` to use generic typings
): Promise<ActionStep<any, any>> {
  return async (stepId, resolve, options = {}) => {
    const controlSchema = options?.controlSchema || emptySchema;

    await discoverStep(targetWorkflow, stepId, {
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
