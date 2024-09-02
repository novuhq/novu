import { emptySchema } from '../../schemas';
import type { Awaitable, CustomStep, DiscoverWorkflowOutput, StepType, StepOutput } from '../../types';
import { transformSchema } from '../../validators';
import { discoverStep } from './discover-step';

export function discoverCustomStepFactory(targetWorkflow: DiscoverWorkflowOutput, type: StepType): CustomStep {
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
