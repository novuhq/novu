import type { FromSchema, Schema } from '../../types';

type StepResolverContext<TPayload extends Record<string, unknown> = Record<string, unknown>> = {
  payload: TPayload;
  subscriber: Record<string, unknown>;
  context: Record<string, unknown>;
  steps: Record<string, unknown>;
};

type ResolveControls<T extends Schema | undefined> = T extends Schema ? FromSchema<T> : Record<string, unknown>;

export type EmailStepResolver<
  TControlSchema extends Schema | undefined = undefined,
  TPayloadSchema extends Schema | undefined = undefined,
> = {
  type: 'email';
  stepId: string;
  resolve: (
    controls: ResolveControls<TControlSchema>,
    ctx: StepResolverContext<ResolveControls<TPayloadSchema>>
  ) => Promise<{ subject: unknown; body: unknown }>;
  controlSchema?: TControlSchema;
};

function email<
  TControlSchema extends Schema | undefined = undefined,
  TPayloadSchema extends Schema | undefined = undefined,
>(
  stepId: string,
  resolve: (
    controls: ResolveControls<TControlSchema>,
    ctx: StepResolverContext<ResolveControls<TPayloadSchema>>
  ) => Promise<{ subject: unknown; body: unknown }>,
  options?: {
    controlSchema?: TControlSchema;
    payloadSchema?: TPayloadSchema;
  }
): EmailStepResolver<TControlSchema, TPayloadSchema> {
  return {
    type: 'email',
    stepId,
    resolve: resolve as EmailStepResolver<TControlSchema, TPayloadSchema>['resolve'],
    controlSchema: options?.controlSchema,
  };
}

export const step = { email };
