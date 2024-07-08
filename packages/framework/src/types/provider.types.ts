import { providerSchemas } from '../schemas';
import type { FromSchema } from './schema.types';

export type Providers<T_StepType extends keyof typeof providerSchemas, T_Control, T_Output> = {
  [K in keyof (typeof providerSchemas)[T_StepType]]: (step: {
    /**
     * The controls for the step.
     *
     * @deprecated Use `controls` instead
     */
    inputs: T_Control;
    /**
     * The controls for the step.
     */
    controls: T_Control;
    /**
     * The outputs of the step.
     */
    outputs: T_Output;
    // eslint-disable-next-line multiline-comment-style
    // TODO: fix the typing for `type` to use the keyof providerSchema[channelType]
    // @ts-expect-error - Types of parameters 'options' and 'options' are incompatible.
  }) => Promise<FromSchema<(typeof providerSchemas)[T_StepType][K]['output']>>;
};
