import { defineEnv, type Env, type EnvSchema, type EnvService } from './env';
import { envSchema } from './env.schema';
import { validateEnvSchema } from './env-validation';
import type { IQueueBackendRequirements } from './queue-backend';

export interface AppEnvOptions {
  /** The service whose `boot` rules `validateEnv` applies. */
  service: EnvService;
  /** Also checks the feature flag family at boot: `*_NUMBER` and MAX_ENVIRONMENT_COUNT as numbers, `IS_*` as booleans. */
  checkFeatureFlags?: boolean;
}

function warnDeprecatedEnv(schema: EnvSchema): void {
  for (const [name, definition] of Object.entries(schema)) {
    // biome-ignore lint/plugin: a deprecated variable has no env.X, so the warning checks the raw environment
    if (definition.deprecated && process.env[name]) {
      console.warn(`[Env] ${name} is deprecated and still set. ${definition.deprecated}`);
    }
  }
}

/**
 * Builds an app's `env` from the shared schema plus the variables only that app reads.
 * Redeclaring a shared key does not compile.
 *
 * `validateEnv`: call once at boot, after secrets are hydrated. Checks the variables the service's
 * `boot` rules name, then the queue backend settings for the queues it uses, and throws if any is
 * missing or invalid.
 *
 * `warnDeprecatedEnv`: call once at boot, after `validateEnv`. Logs the name of each deprecated
 * variable that is still set, never its value.
 *
 * `env` is typed as two `Env`s because `Env<typeof envSchema & S>` collapses to `never` for apps
 * compiled with strictNullChecks, like the worker.
 */
export function createAppEnv<S extends EnvSchema & { readonly [K in keyof typeof envSchema]?: never }>(
  appSchema: S,
  options: AppEnvOptions
): {
  env: Env<typeof envSchema> & Env<S>;
  validateEnv: (queueBackend: IQueueBackendRequirements) => void;
  warnDeprecatedEnv: () => void;
} {
  const schema: EnvSchema = { ...envSchema, ...appSchema };

  return {
    env: defineEnv(schema) as Env<typeof envSchema> & Env<S>,
    validateEnv: (queueBackend) =>
      validateEnvSchema(options.service, schema, { checkFeatureFlags: options.checkFeatureFlags, queueBackend }),
    warnDeprecatedEnv: () => warnDeprecatedEnv(schema),
  };
}
