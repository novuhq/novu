import type { FromSchema, Schema } from '../../types';
import type {
  ChatOutputUnvalidated,
  EmailOutputUnvalidated,
  InAppOutputUnvalidated,
  PushOutputUnvalidated,
  SmsOutputUnvalidated,
} from '../../types/step.types';

type StepResolverContext<TPayload extends Record<string, unknown> = Record<string, unknown>> = {
  payload: TPayload;
  subscriber: Record<string, unknown>;
  context: Record<string, unknown>;
  steps: Record<string, unknown>;
};

type ResolveControls<T extends Schema | undefined> = T extends Schema ? FromSchema<T> : Record<string, unknown>;

type StepResolverOptions<TControlSchema extends Schema | undefined, TPayloadSchema extends Schema | undefined> = {
  controlSchema?: TControlSchema;
  payloadSchema?: TPayloadSchema;
};

export type EmailStepResolver<
  TControlSchema extends Schema | undefined = undefined,
  TPayloadSchema extends Schema | undefined = undefined,
> = {
  type: 'email';
  stepId: string;
  resolve: (
    controls: ResolveControls<TControlSchema>,
    ctx: StepResolverContext<ResolveControls<TPayloadSchema>>
  ) => Promise<EmailOutputUnvalidated>;
  controlSchema?: TControlSchema;
  payloadSchema?: TPayloadSchema;
};

export type SmsStepResolver<
  TControlSchema extends Schema | undefined = undefined,
  TPayloadSchema extends Schema | undefined = undefined,
> = {
  type: 'sms';
  stepId: string;
  resolve: (
    controls: ResolveControls<TControlSchema>,
    ctx: StepResolverContext<ResolveControls<TPayloadSchema>>
  ) => Promise<SmsOutputUnvalidated>;
  controlSchema?: TControlSchema;
  payloadSchema?: TPayloadSchema;
};

export type ChatStepResolver<
  TControlSchema extends Schema | undefined = undefined,
  TPayloadSchema extends Schema | undefined = undefined,
> = {
  type: 'chat';
  stepId: string;
  resolve: (
    controls: ResolveControls<TControlSchema>,
    ctx: StepResolverContext<ResolveControls<TPayloadSchema>>
  ) => Promise<ChatOutputUnvalidated>;
  controlSchema?: TControlSchema;
  payloadSchema?: TPayloadSchema;
};

export type PushStepResolver<
  TControlSchema extends Schema | undefined = undefined,
  TPayloadSchema extends Schema | undefined = undefined,
> = {
  type: 'push';
  stepId: string;
  resolve: (
    controls: ResolveControls<TControlSchema>,
    ctx: StepResolverContext<ResolveControls<TPayloadSchema>>
  ) => Promise<PushOutputUnvalidated>;
  controlSchema?: TControlSchema;
  payloadSchema?: TPayloadSchema;
};

export type InAppStepResolver<
  TControlSchema extends Schema | undefined = undefined,
  TPayloadSchema extends Schema | undefined = undefined,
> = {
  type: 'in_app';
  stepId: string;
  resolve: (
    controls: ResolveControls<TControlSchema>,
    ctx: StepResolverContext<ResolveControls<TPayloadSchema>>
  ) => Promise<InAppOutputUnvalidated>;
  controlSchema?: TControlSchema;
  payloadSchema?: TPayloadSchema;
};

export type AnyStepResolver =
  | EmailStepResolver<Schema | undefined, Schema | undefined>
  | SmsStepResolver<Schema | undefined, Schema | undefined>
  | ChatStepResolver<Schema | undefined, Schema | undefined>
  | PushStepResolver<Schema | undefined, Schema | undefined>
  | InAppStepResolver<Schema | undefined, Schema | undefined>;

function email<
  TControlSchema extends Schema | undefined = undefined,
  TPayloadSchema extends Schema | undefined = undefined,
>(
  stepId: string,
  resolve: (
    controls: ResolveControls<TControlSchema>,
    ctx: StepResolverContext<ResolveControls<TPayloadSchema>>
  ) => Promise<EmailOutputUnvalidated>,
  options?: StepResolverOptions<TControlSchema, TPayloadSchema>
): EmailStepResolver<TControlSchema, TPayloadSchema> {
  return {
    type: 'email',
    stepId,
    resolve: resolve as EmailStepResolver<TControlSchema, TPayloadSchema>['resolve'],
    controlSchema: options?.controlSchema,
    payloadSchema: options?.payloadSchema,
  };
}

function sms<
  TControlSchema extends Schema | undefined = undefined,
  TPayloadSchema extends Schema | undefined = undefined,
>(
  stepId: string,
  resolve: (
    controls: ResolveControls<TControlSchema>,
    ctx: StepResolverContext<ResolveControls<TPayloadSchema>>
  ) => Promise<SmsOutputUnvalidated>,
  options?: StepResolverOptions<TControlSchema, TPayloadSchema>
): SmsStepResolver<TControlSchema, TPayloadSchema> {
  return {
    type: 'sms',
    stepId,
    resolve: resolve as SmsStepResolver<TControlSchema, TPayloadSchema>['resolve'],
    controlSchema: options?.controlSchema,
    payloadSchema: options?.payloadSchema,
  };
}

function chat<
  TControlSchema extends Schema | undefined = undefined,
  TPayloadSchema extends Schema | undefined = undefined,
>(
  stepId: string,
  resolve: (
    controls: ResolveControls<TControlSchema>,
    ctx: StepResolverContext<ResolveControls<TPayloadSchema>>
  ) => Promise<ChatOutputUnvalidated>,
  options?: StepResolverOptions<TControlSchema, TPayloadSchema>
): ChatStepResolver<TControlSchema, TPayloadSchema> {
  return {
    type: 'chat',
    stepId,
    resolve: resolve as ChatStepResolver<TControlSchema, TPayloadSchema>['resolve'],
    controlSchema: options?.controlSchema,
    payloadSchema: options?.payloadSchema,
  };
}

function push<
  TControlSchema extends Schema | undefined = undefined,
  TPayloadSchema extends Schema | undefined = undefined,
>(
  stepId: string,
  resolve: (
    controls: ResolveControls<TControlSchema>,
    ctx: StepResolverContext<ResolveControls<TPayloadSchema>>
  ) => Promise<PushOutputUnvalidated>,
  options?: StepResolverOptions<TControlSchema, TPayloadSchema>
): PushStepResolver<TControlSchema, TPayloadSchema> {
  return {
    type: 'push',
    stepId,
    resolve: resolve as PushStepResolver<TControlSchema, TPayloadSchema>['resolve'],
    controlSchema: options?.controlSchema,
    payloadSchema: options?.payloadSchema,
  };
}

function inApp<
  TControlSchema extends Schema | undefined = undefined,
  TPayloadSchema extends Schema | undefined = undefined,
>(
  stepId: string,
  resolve: (
    controls: ResolveControls<TControlSchema>,
    ctx: StepResolverContext<ResolveControls<TPayloadSchema>>
  ) => Promise<InAppOutputUnvalidated>,
  options?: StepResolverOptions<TControlSchema, TPayloadSchema>
): InAppStepResolver<TControlSchema, TPayloadSchema> {
  return {
    type: 'in_app',
    stepId,
    resolve: resolve as InAppStepResolver<TControlSchema, TPayloadSchema>['resolve'],
    controlSchema: options?.controlSchema,
    payloadSchema: options?.payloadSchema,
  };
}

export const step = { email, sms, chat, push, inApp };
