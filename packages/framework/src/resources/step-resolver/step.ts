import { providerSchemas } from '../../schemas/providers';
import type { FromSchema, Schema } from '../../types';
import type { ContextResolved } from '../../types/context.types';
import type { WithPassthrough } from '../../types/provider.types';
import type {
  ChatOutputUnvalidated,
  EmailOutputUnvalidated,
  InAppOutputUnvalidated,
  PushOutputUnvalidated,
  SmsOutputUnvalidated,
} from '../../types/step.types';
import type { Subscriber } from '../../types/subscriber.types';
import type { Awaitable } from '../../types/util.types';

export type StepResolverContext<TPayload extends Record<string, unknown> = Record<string, unknown>> = {
  payload: TPayload;
  subscriber: Subscriber;
  context: ContextResolved;
  steps: Record<string, unknown>;
};

type ResolveControls<T extends Schema | undefined> = T extends Schema ? FromSchema<T> : Record<string, unknown>;

type StepResolverProviders<
  T_StepType extends keyof typeof providerSchemas,
  T_Controls,
  T_Output,
  T_Payload extends Record<string, unknown> = Record<string, unknown>,
> = {
  [K in keyof (typeof providerSchemas)[T_StepType]]?: (
    step: { controls: T_Controls; outputs: T_Output },
    ctx: StepResolverContext<T_Payload>
  ) => Awaitable<WithPassthrough<Record<string, unknown>>>;
};

type BaseStepResolverOptions<TControlSchema extends Schema | undefined, TPayloadSchema extends Schema | undefined> = {
  controlSchema?: TControlSchema;
  payloadSchema?: TPayloadSchema;
  skip?: (
    controls: ResolveControls<TControlSchema>,
    ctx: StepResolverContext<ResolveControls<TPayloadSchema>>
  ) => Awaitable<boolean>;
};

type ChannelStepResolverOptions<
  T_StepType extends keyof typeof providerSchemas,
  TControlSchema extends Schema | undefined,
  TPayloadSchema extends Schema | undefined,
  T_Output extends Record<string, unknown>,
> = BaseStepResolverOptions<TControlSchema, TPayloadSchema> & {
  providers?: StepResolverProviders<
    T_StepType,
    ResolveControls<TControlSchema>,
    T_Output,
    ResolveControls<TPayloadSchema>
  >;
  disableOutputSanitization?: boolean;
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
  skip?: BaseStepResolverOptions<TControlSchema, TPayloadSchema>['skip'];
  providers?: StepResolverProviders<
    'email',
    ResolveControls<TControlSchema>,
    EmailOutputUnvalidated,
    ResolveControls<TPayloadSchema>
  >;
  disableOutputSanitization?: boolean;
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
  skip?: BaseStepResolverOptions<TControlSchema, TPayloadSchema>['skip'];
  providers?: StepResolverProviders<
    'sms',
    ResolveControls<TControlSchema>,
    SmsOutputUnvalidated,
    ResolveControls<TPayloadSchema>
  >;
  disableOutputSanitization?: boolean;
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
  skip?: BaseStepResolverOptions<TControlSchema, TPayloadSchema>['skip'];
  providers?: StepResolverProviders<
    'chat',
    ResolveControls<TControlSchema>,
    ChatOutputUnvalidated,
    ResolveControls<TPayloadSchema>
  >;
  disableOutputSanitization?: boolean;
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
  skip?: BaseStepResolverOptions<TControlSchema, TPayloadSchema>['skip'];
  providers?: StepResolverProviders<
    'push',
    ResolveControls<TControlSchema>,
    PushOutputUnvalidated,
    ResolveControls<TPayloadSchema>
  >;
  disableOutputSanitization?: boolean;
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
  skip?: BaseStepResolverOptions<TControlSchema, TPayloadSchema>['skip'];
  providers?: StepResolverProviders<
    'in_app',
    ResolveControls<TControlSchema>,
    InAppOutputUnvalidated,
    ResolveControls<TPayloadSchema>
  >;
  disableOutputSanitization?: boolean;
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
  options?: ChannelStepResolverOptions<'email', TControlSchema, TPayloadSchema, EmailOutputUnvalidated>
): EmailStepResolver<TControlSchema, TPayloadSchema> {
  return {
    type: 'email',
    stepId,
    resolve: resolve as EmailStepResolver<TControlSchema, TPayloadSchema>['resolve'],
    controlSchema: options?.controlSchema,
    payloadSchema: options?.payloadSchema,
    skip: options?.skip,
    providers: options?.providers as EmailStepResolver<TControlSchema, TPayloadSchema>['providers'],
    disableOutputSanitization: options?.disableOutputSanitization,
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
  options?: ChannelStepResolverOptions<'sms', TControlSchema, TPayloadSchema, SmsOutputUnvalidated>
): SmsStepResolver<TControlSchema, TPayloadSchema> {
  return {
    type: 'sms',
    stepId,
    resolve: resolve as SmsStepResolver<TControlSchema, TPayloadSchema>['resolve'],
    controlSchema: options?.controlSchema,
    payloadSchema: options?.payloadSchema,
    skip: options?.skip,
    providers: options?.providers as SmsStepResolver<TControlSchema, TPayloadSchema>['providers'],
    disableOutputSanitization: options?.disableOutputSanitization,
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
  options?: ChannelStepResolverOptions<'chat', TControlSchema, TPayloadSchema, ChatOutputUnvalidated>
): ChatStepResolver<TControlSchema, TPayloadSchema> {
  return {
    type: 'chat',
    stepId,
    resolve: resolve as ChatStepResolver<TControlSchema, TPayloadSchema>['resolve'],
    controlSchema: options?.controlSchema,
    payloadSchema: options?.payloadSchema,
    skip: options?.skip,
    providers: options?.providers as ChatStepResolver<TControlSchema, TPayloadSchema>['providers'],
    disableOutputSanitization: options?.disableOutputSanitization,
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
  options?: ChannelStepResolverOptions<'push', TControlSchema, TPayloadSchema, PushOutputUnvalidated>
): PushStepResolver<TControlSchema, TPayloadSchema> {
  return {
    type: 'push',
    stepId,
    resolve: resolve as PushStepResolver<TControlSchema, TPayloadSchema>['resolve'],
    controlSchema: options?.controlSchema,
    payloadSchema: options?.payloadSchema,
    skip: options?.skip,
    providers: options?.providers as PushStepResolver<TControlSchema, TPayloadSchema>['providers'],
    disableOutputSanitization: options?.disableOutputSanitization,
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
  options?: ChannelStepResolverOptions<'in_app', TControlSchema, TPayloadSchema, InAppOutputUnvalidated>
): InAppStepResolver<TControlSchema, TPayloadSchema> {
  return {
    type: 'in_app',
    stepId,
    resolve: resolve as InAppStepResolver<TControlSchema, TPayloadSchema>['resolve'],
    controlSchema: options?.controlSchema,
    payloadSchema: options?.payloadSchema,
    skip: options?.skip,
    providers: options?.providers as InAppStepResolver<TControlSchema, TPayloadSchema>['providers'],
    disableOutputSanitization: options?.disableOutputSanitization,
  };
}

export const step = { email, sms, chat, push, inApp };
