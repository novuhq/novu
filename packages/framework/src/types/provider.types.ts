import { providerSchemas } from '../schemas';
import { FromSchema } from './schema.types';

export type Providers<T_StepType extends keyof typeof providerSchemas, T_Input, T_Output> = {
  [K in keyof (typeof providerSchemas)[T_StepType]]: (step: {
    /**
     * The inputs for the step.
     */
    inputs: T_Input;
    /**
     * The outputs of the step.
     */
    outputs: T_Output;
    // @ts-expect-error - FIXME: Fix conditional types
  }) => Promise<FromSchema<(typeof providerSchemas)[T_StepType][K]['output']>>;
};

type Test = typeof providerSchemas;
