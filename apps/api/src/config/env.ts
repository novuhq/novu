import { createAppEnv } from '@novu/application-generic';

/**
 * Variables only the api reads, added to the shared ones in
 * libs/application-generic/src/config/env.schema.ts. Read both with `env.X` from this file.
 */
export const { env, warnDeprecatedEnv } = createAppEnv({});
