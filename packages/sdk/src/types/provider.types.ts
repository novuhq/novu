import { FromSchema } from 'json-schema-to-ts';

import { providerSchemas } from '../schemas';

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
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - FromSchema (json-schema-to-ts) is incorrectly typed
  }) => Promise<FromSchema<(typeof providerSchemas)[T_StepType][K]['output']>>;
};
