import { providerSchemas } from '../schemas';
import type { FromSchemaUnvalidated } from './schema.types';
import { Awaitable, Prettify } from './util.types';

export type Passthrough = {
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  query?: Record<string, string>;
};

export type WithPassthrough<T> = Prettify<T & { _passthrough?: Passthrough }>;

export type Providers<T_StepType extends keyof typeof providerSchemas, T_Controls, T_Output> = {
  [K in keyof (typeof providerSchemas)[T_StepType]]?: (step: {
    /**
     * The controls for the step.
     *
     * @deprecated Use `controls` instead
     */
    inputs: T_Controls;
    /**
     * The controls for the step.
     */
    controls: T_Controls;
    /**
     * The outputs of the step.
     */
    outputs: T_Output;
    // eslint-disable-next-line multiline-comment-style
    // TODO: fix the typing for `type` to use the keyof providerSchema[channelType]
    // @ts-expect-error - Types of parameters 'options' and 'options' are incompatible.
  }) => Awaitable<WithPassthrough<FromSchemaUnvalidated<(typeof providerSchemas)[T_StepType][K]['output']>>>;
};
