import { emptySchema } from '../../schemas';
import type {
  Awaitable,
  CustomStep,
  DiscoverWorkflowOutput,
  Schema,
  StepOptions,
  StepOutput,
  StepType,
} from '../../types';
import { transformSchema } from '../../validators';
import { discoverStep } from './discover-step';

export async function discoverCustomStepFactory(
  targetWorkflow: DiscoverWorkflowOutput,
  type: StepType
): Promise<CustomStep> {
  return async (stepId, resolve, options = {}) => {
    const controlSchema = options?.controlSchema || emptySchema;
    const outputSchema = options?.outputSchema || emptySchema;

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
        schema: await transformSchema(outputSchema),
        unknownSchema: outputSchema,
      },
      resolve: resolve as (controls: Record<string, unknown>) => Awaitable<Record<string, unknown>>,
      code: resolve.toString(),
      options: options as StepOptions<Schema, Record<string, unknown>>,
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
    } as Awaited<StepOutput<any>>;
  };
}
