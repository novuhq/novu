import { providerSchemas } from '../../schemas/providers';
import type { FromSchema, Schema } from '../../types';
import type { ContextResolved } from '../../types/context.types';
import type { EnvironmentSystemVariables } from '../../types/environment.types';
import type { WithPassthrough } from '../../types/provider.types';
import type {
  ChatOutputUnvalidated,
  DelayOutputUnvalidated,
  DigestOutputUnvalidated,
  EmailOutputUnvalidated,
  InAppOutputUnvalidated,
  PushOutputUnvalidated,
  SmsOutputUnvalidated,
  ThrottleOutputUnvalidated,
} from '../../types/step.types';
import type { Subscriber } from '../../types/subscriber.types';
import type { Awaitable } from '../../types/util.types';

export type StepResolverContext<
  TPayload extends Record<string, unknown> = Record<string, unknown>,
  TEnv extends Record<string, unknown> = Record<string, string>,
> = {
  payload: TPayload;
  subscriber: Subscriber;
  context: ContextResolved;
  steps: Record<string, unknown>;
  /**
   * Environment variables defined in the Novu Dashboard, merged with built-in
   * environment system variables (`name`, `type`).
   *
   * @example `env.name` — name of the current Novu environment
   * @example `env.type` — type of the current Novu environment ("dev" | "prod")
   * @example `env.MY_SECRET` — a user-defined environment variable
   */
  env: TEnv & EnvironmentSystemVariables;
};

type ResolveControls<T extends Schema | undefined> = T extends Schema ? FromSchema<T> : Record<string, unknown>;

type ResolveEnv<T extends Schema | undefined> = T extends Schema ? FromSchema<T> : Record<string, string>;

type StepResolverProviders<
  T_StepType extends keyof typeof providerSchemas,
  T_Controls,
  T_Output,
  T_Payload extends Record<string, unknown> = Record<string, unknown>,
  T_Env extends Record<string, unknown> = Record<string, string>,
> = {
  [K in keyof (typeof providerSchemas)[T_StepType]]?: (
    step: { controls: T_Controls; outputs: T_Output },
    ctx: StepResolverContext<T_Payload, T_Env>
  ) => Awaitable<WithPassthrough<Record<string, unknown>>>;
};

type BaseStepResolverOptions<
  TControlSchema extends Schema | undefined,
  TPayloadSchema extends Schema | undefined,
  TEnvSchema extends Schema | undefined = undefined,
> = {
  controlSchema?: TControlSchema;
  payloadSchema?: TPayloadSchema;
  envSchema?: TEnvSchema;
  skip?: (
    controls: ResolveControls<TControlSchema>,
    ctx: StepResolverContext<ResolveControls<TPayloadSchema>, ResolveEnv<TEnvSchema>>
  ) => Awaitable<boolean>;
};

type ChannelStepResolverOptions<
  T_StepType extends keyof typeof providerSchemas,
  TControlSchema extends Schema | undefined,
  TPayloadSchema extends Schema | undefined,
  T_Output extends Record<string, unknown>,
  TEnvSchema extends Schema | undefined = undefined,
> = BaseStepResolverOptions<TControlSchema, TPayloadSchema, TEnvSchema> & {
  providers?: StepResolverProviders<
    T_StepType,
    ResolveControls<TControlSchema>,
    T_Output,
    ResolveControls<TPayloadSchema>,
    ResolveEnv<TEnvSchema>
  >;
  disableOutputSanitization?: boolean;
};

export type EmailStepResolver<
  TControlSchema extends Schema | undefined = undefined,
  TPayloadSchema extends Schema | undefined = undefined,
  TEnvSchema extends Schema | undefined = undefined,
> = {
  type: 'email';
  stepId: string;
  resolve: (
    controls: ResolveControls<TControlSchema>,
    ctx: StepResolverContext<ResolveControls<TPayloadSchema>, ResolveEnv<TEnvSchema>>
  ) => Promise<EmailOutputUnvalidated>;
  controlSchema?: TControlSchema;
  payloadSchema?: TPayloadSchema;
  envSchema?: TEnvSchema;
  skip?: BaseStepResolverOptions<TControlSchema, TPayloadSchema, TEnvSchema>['skip'];
  providers?: StepResolverProviders<
    'email',
    ResolveControls<TControlSchema>,
    EmailOutputUnvalidated,
    ResolveControls<TPayloadSchema>,
    ResolveEnv<TEnvSchema>
  >;
  disableOutputSanitization?: boolean;
};

export type SmsStepResolver<
  TControlSchema extends Schema | undefined = undefined,
  TPayloadSchema extends Schema | undefined = undefined,
  TEnvSchema extends Schema | undefined = undefined,
> = {
  type: 'sms';
  stepId: string;
  resolve: (
    controls: ResolveControls<TControlSchema>,
    ctx: StepResolverContext<ResolveControls<TPayloadSchema>, ResolveEnv<TEnvSchema>>
  ) => Promise<SmsOutputUnvalidated>;
  controlSchema?: TControlSchema;
  payloadSchema?: TPayloadSchema;
  envSchema?: TEnvSchema;
  skip?: BaseStepResolverOptions<TControlSchema, TPayloadSchema, TEnvSchema>['skip'];
  providers?: StepResolverProviders<
    'sms',
    ResolveControls<TControlSchema>,
    SmsOutputUnvalidated,
    ResolveControls<TPayloadSchema>,
    ResolveEnv<TEnvSchema>
  >;
  disableOutputSanitization?: boolean;
};

export type ChatStepResolver<
  TControlSchema extends Schema | undefined = undefined,
  TPayloadSchema extends Schema | undefined = undefined,
  TEnvSchema extends Schema | undefined = undefined,
> = {
  type: 'chat';
  stepId: string;
  resolve: (
    controls: ResolveControls<TControlSchema>,
    ctx: StepResolverContext<ResolveControls<TPayloadSchema>, ResolveEnv<TEnvSchema>>
  ) => Promise<ChatOutputUnvalidated>;
  controlSchema?: TControlSchema;
  payloadSchema?: TPayloadSchema;
  envSchema?: TEnvSchema;
  skip?: BaseStepResolverOptions<TControlSchema, TPayloadSchema, TEnvSchema>['skip'];
  providers?: StepResolverProviders<
    'chat',
    ResolveControls<TControlSchema>,
    ChatOutputUnvalidated,
    ResolveControls<TPayloadSchema>,
    ResolveEnv<TEnvSchema>
  >;
  disableOutputSanitization?: boolean;
};

export type PushStepResolver<
  TControlSchema extends Schema | undefined = undefined,
  TPayloadSchema extends Schema | undefined = undefined,
  TEnvSchema extends Schema | undefined = undefined,
> = {
  type: 'push';
  stepId: string;
  resolve: (
    controls: ResolveControls<TControlSchema>,
    ctx: StepResolverContext<ResolveControls<TPayloadSchema>, ResolveEnv<TEnvSchema>>
  ) => Promise<PushOutputUnvalidated>;
  controlSchema?: TControlSchema;
  payloadSchema?: TPayloadSchema;
  envSchema?: TEnvSchema;
  skip?: BaseStepResolverOptions<TControlSchema, TPayloadSchema, TEnvSchema>['skip'];
  providers?: StepResolverProviders<
    'push',
    ResolveControls<TControlSchema>,
    PushOutputUnvalidated,
    ResolveControls<TPayloadSchema>,
    ResolveEnv<TEnvSchema>
  >;
  disableOutputSanitization?: boolean;
};

export type InAppStepResolver<
  TControlSchema extends Schema | undefined = undefined,
  TPayloadSchema extends Schema | undefined = undefined,
  TEnvSchema extends Schema | undefined = undefined,
> = {
  type: 'in_app';
  stepId: string;
  resolve: (
    controls: ResolveControls<TControlSchema>,
    ctx: StepResolverContext<ResolveControls<TPayloadSchema>, ResolveEnv<TEnvSchema>>
  ) => Promise<InAppOutputUnvalidated>;
  controlSchema?: TControlSchema;
  payloadSchema?: TPayloadSchema;
  envSchema?: TEnvSchema;
  skip?: BaseStepResolverOptions<TControlSchema, TPayloadSchema, TEnvSchema>['skip'];
  providers?: StepResolverProviders<
    'in_app',
    ResolveControls<TControlSchema>,
    InAppOutputUnvalidated,
    ResolveControls<TPayloadSchema>,
    ResolveEnv<TEnvSchema>
  >;
  disableOutputSanitization?: boolean;
};

export type DelayStepResolver<
  TControlSchema extends Schema | undefined = undefined,
  TPayloadSchema extends Schema | undefined = undefined,
  TEnvSchema extends Schema | undefined = undefined,
> = {
  type: 'delay';
  stepId: string;
  resolve: (
    controls: ResolveControls<TControlSchema>,
    ctx: StepResolverContext<ResolveControls<TPayloadSchema>, ResolveEnv<TEnvSchema>>
  ) => Promise<DelayOutputUnvalidated>;
  controlSchema?: TControlSchema;
  payloadSchema?: TPayloadSchema;
  envSchema?: TEnvSchema;
  skip?: BaseStepResolverOptions<TControlSchema, TPayloadSchema, TEnvSchema>['skip'];
};

export type DigestStepResolver<
  TControlSchema extends Schema | undefined = undefined,
  TPayloadSchema extends Schema | undefined = undefined,
  TEnvSchema extends Schema | undefined = undefined,
> = {
  type: 'digest';
  stepId: string;
  resolve: (
    controls: ResolveControls<TControlSchema>,
    ctx: StepResolverContext<ResolveControls<TPayloadSchema>, ResolveEnv<TEnvSchema>>
  ) => Promise<DigestOutputUnvalidated>;
  controlSchema?: TControlSchema;
  payloadSchema?: TPayloadSchema;
  envSchema?: TEnvSchema;
  skip?: BaseStepResolverOptions<TControlSchema, TPayloadSchema, TEnvSchema>['skip'];
};

export type ThrottleStepResolver<
  TControlSchema extends Schema | undefined = undefined,
  TPayloadSchema extends Schema | undefined = undefined,
  TEnvSchema extends Schema | undefined = undefined,
> = {
  type: 'throttle';
  stepId: string;
  resolve: (
    controls: ResolveControls<TControlSchema>,
    ctx: StepResolverContext<ResolveControls<TPayloadSchema>, ResolveEnv<TEnvSchema>>
  ) => Promise<ThrottleOutputUnvalidated>;
  controlSchema?: TControlSchema;
  payloadSchema?: TPayloadSchema;
  envSchema?: TEnvSchema;
  skip?: BaseStepResolverOptions<TControlSchema, TPayloadSchema, TEnvSchema>['skip'];
};

export type AnyStepResolver =
  | EmailStepResolver<Schema | undefined, Schema | undefined, Schema | undefined>
  | SmsStepResolver<Schema | undefined, Schema | undefined, Schema | undefined>
  | ChatStepResolver<Schema | undefined, Schema | undefined, Schema | undefined>
  | PushStepResolver<Schema | undefined, Schema | undefined, Schema | undefined>
  | InAppStepResolver<Schema | undefined, Schema | undefined, Schema | undefined>
  | DelayStepResolver<Schema | undefined, Schema | undefined, Schema | undefined>
  | DigestStepResolver<Schema | undefined, Schema | undefined, Schema | undefined>
  | ThrottleStepResolver<Schema | undefined, Schema | undefined, Schema | undefined>;

function email<
  TControlSchema extends Schema | undefined = undefined,
  TPayloadSchema extends Schema | undefined = undefined,
  TEnvSchema extends Schema | undefined = undefined,
>(
  stepId: string,
  resolve: (
    controls: ResolveControls<TControlSchema>,
    ctx: StepResolverContext<ResolveControls<TPayloadSchema>, ResolveEnv<TEnvSchema>>
  ) => Promise<EmailOutputUnvalidated>,
  options?: ChannelStepResolverOptions<'email', TControlSchema, TPayloadSchema, EmailOutputUnvalidated, TEnvSchema>
): EmailStepResolver<TControlSchema, TPayloadSchema, TEnvSchema> {
  return {
    type: 'email',
    stepId,
    resolve: resolve as EmailStepResolver<TControlSchema, TPayloadSchema, TEnvSchema>['resolve'],
    controlSchema: options?.controlSchema,
    payloadSchema: options?.payloadSchema,
    envSchema: options?.envSchema,
    skip: options?.skip,
    providers: options?.providers as EmailStepResolver<TControlSchema, TPayloadSchema, TEnvSchema>['providers'],
    disableOutputSanitization: options?.disableOutputSanitization,
  };
}

function sms<
  TControlSchema extends Schema | undefined = undefined,
  TPayloadSchema extends Schema | undefined = undefined,
  TEnvSchema extends Schema | undefined = undefined,
>(
  stepId: string,
  resolve: (
    controls: ResolveControls<TControlSchema>,
    ctx: StepResolverContext<ResolveControls<TPayloadSchema>, ResolveEnv<TEnvSchema>>
  ) => Promise<SmsOutputUnvalidated>,
  options?: ChannelStepResolverOptions<'sms', TControlSchema, TPayloadSchema, SmsOutputUnvalidated, TEnvSchema>
): SmsStepResolver<TControlSchema, TPayloadSchema, TEnvSchema> {
  return {
    type: 'sms',
    stepId,
    resolve: resolve as SmsStepResolver<TControlSchema, TPayloadSchema, TEnvSchema>['resolve'],
    controlSchema: options?.controlSchema,
    payloadSchema: options?.payloadSchema,
    envSchema: options?.envSchema,
    skip: options?.skip,
    providers: options?.providers as SmsStepResolver<TControlSchema, TPayloadSchema, TEnvSchema>['providers'],
    disableOutputSanitization: options?.disableOutputSanitization,
  };
}

function chat<
  TControlSchema extends Schema | undefined = undefined,
  TPayloadSchema extends Schema | undefined = undefined,
  TEnvSchema extends Schema | undefined = undefined,
>(
  stepId: string,
  resolve: (
    controls: ResolveControls<TControlSchema>,
    ctx: StepResolverContext<ResolveControls<TPayloadSchema>, ResolveEnv<TEnvSchema>>
  ) => Promise<ChatOutputUnvalidated>,
  options?: ChannelStepResolverOptions<'chat', TControlSchema, TPayloadSchema, ChatOutputUnvalidated, TEnvSchema>
): ChatStepResolver<TControlSchema, TPayloadSchema, TEnvSchema> {
  return {
    type: 'chat',
    stepId,
    resolve: resolve as ChatStepResolver<TControlSchema, TPayloadSchema, TEnvSchema>['resolve'],
    controlSchema: options?.controlSchema,
    payloadSchema: options?.payloadSchema,
    envSchema: options?.envSchema,
    skip: options?.skip,
    providers: options?.providers as ChatStepResolver<TControlSchema, TPayloadSchema, TEnvSchema>['providers'],
    disableOutputSanitization: options?.disableOutputSanitization,
  };
}

function push<
  TControlSchema extends Schema | undefined = undefined,
  TPayloadSchema extends Schema | undefined = undefined,
  TEnvSchema extends Schema | undefined = undefined,
>(
  stepId: string,
  resolve: (
    controls: ResolveControls<TControlSchema>,
    ctx: StepResolverContext<ResolveControls<TPayloadSchema>, ResolveEnv<TEnvSchema>>
  ) => Promise<PushOutputUnvalidated>,
  options?: ChannelStepResolverOptions<'push', TControlSchema, TPayloadSchema, PushOutputUnvalidated, TEnvSchema>
): PushStepResolver<TControlSchema, TPayloadSchema, TEnvSchema> {
  return {
    type: 'push',
    stepId,
    resolve: resolve as PushStepResolver<TControlSchema, TPayloadSchema, TEnvSchema>['resolve'],
    controlSchema: options?.controlSchema,
    payloadSchema: options?.payloadSchema,
    envSchema: options?.envSchema,
    skip: options?.skip,
    providers: options?.providers as PushStepResolver<TControlSchema, TPayloadSchema, TEnvSchema>['providers'],
    disableOutputSanitization: options?.disableOutputSanitization,
  };
}

function inApp<
  TControlSchema extends Schema | undefined = undefined,
  TPayloadSchema extends Schema | undefined = undefined,
  TEnvSchema extends Schema | undefined = undefined,
>(
  stepId: string,
  resolve: (
    controls: ResolveControls<TControlSchema>,
    ctx: StepResolverContext<ResolveControls<TPayloadSchema>, ResolveEnv<TEnvSchema>>
  ) => Promise<InAppOutputUnvalidated>,
  options?: ChannelStepResolverOptions<'in_app', TControlSchema, TPayloadSchema, InAppOutputUnvalidated, TEnvSchema>
): InAppStepResolver<TControlSchema, TPayloadSchema, TEnvSchema> {
  return {
    type: 'in_app',
    stepId,
    resolve: resolve as InAppStepResolver<TControlSchema, TPayloadSchema, TEnvSchema>['resolve'],
    controlSchema: options?.controlSchema,
    payloadSchema: options?.payloadSchema,
    envSchema: options?.envSchema,
    skip: options?.skip,
    providers: options?.providers as InAppStepResolver<TControlSchema, TPayloadSchema, TEnvSchema>['providers'],
    disableOutputSanitization: options?.disableOutputSanitization,
  };
}

function delay<
  TControlSchema extends Schema | undefined = undefined,
  TPayloadSchema extends Schema | undefined = undefined,
  TEnvSchema extends Schema | undefined = undefined,
>(
  stepId: string,
  resolve: (
    controls: ResolveControls<TControlSchema>,
    ctx: StepResolverContext<ResolveControls<TPayloadSchema>, ResolveEnv<TEnvSchema>>
  ) => Promise<DelayOutputUnvalidated>,
  options?: BaseStepResolverOptions<TControlSchema, TPayloadSchema, TEnvSchema>
): DelayStepResolver<TControlSchema, TPayloadSchema, TEnvSchema> {
  return {
    type: 'delay',
    stepId,
    resolve: resolve as DelayStepResolver<TControlSchema, TPayloadSchema, TEnvSchema>['resolve'],
    controlSchema: options?.controlSchema,
    payloadSchema: options?.payloadSchema,
    envSchema: options?.envSchema,
    skip: options?.skip,
  };
}

function digest<
  TControlSchema extends Schema | undefined = undefined,
  TPayloadSchema extends Schema | undefined = undefined,
  TEnvSchema extends Schema | undefined = undefined,
>(
  stepId: string,
  resolve: (
    controls: ResolveControls<TControlSchema>,
    ctx: StepResolverContext<ResolveControls<TPayloadSchema>, ResolveEnv<TEnvSchema>>
  ) => Promise<DigestOutputUnvalidated>,
  options?: BaseStepResolverOptions<TControlSchema, TPayloadSchema, TEnvSchema>
): DigestStepResolver<TControlSchema, TPayloadSchema, TEnvSchema> {
  return {
    type: 'digest',
    stepId,
    resolve: resolve as DigestStepResolver<TControlSchema, TPayloadSchema, TEnvSchema>['resolve'],
    controlSchema: options?.controlSchema,
    payloadSchema: options?.payloadSchema,
    envSchema: options?.envSchema,
    skip: options?.skip,
  };
}

function throttle<
  TControlSchema extends Schema | undefined = undefined,
  TPayloadSchema extends Schema | undefined = undefined,
  TEnvSchema extends Schema | undefined = undefined,
>(
  stepId: string,
  resolve: (
    controls: ResolveControls<TControlSchema>,
    ctx: StepResolverContext<ResolveControls<TPayloadSchema>, ResolveEnv<TEnvSchema>>
  ) => Promise<ThrottleOutputUnvalidated>,
  options?: BaseStepResolverOptions<TControlSchema, TPayloadSchema, TEnvSchema>
): ThrottleStepResolver<TControlSchema, TPayloadSchema, TEnvSchema> {
  return {
    type: 'throttle',
    stepId,
    resolve: resolve as ThrottleStepResolver<TControlSchema, TPayloadSchema, TEnvSchema>['resolve'],
    controlSchema: options?.controlSchema,
    payloadSchema: options?.payloadSchema,
    envSchema: options?.envSchema,
    skip: options?.skip,
  };
}

export const step = { email, sms, chat, push, inApp, delay, digest, throttle };
