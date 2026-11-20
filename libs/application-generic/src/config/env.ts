import { envSchema } from './env.schema';

interface EnvVarBase {
  /** What the variable controls. */
  description: string;
  /**
   * Migration hint, e.g. 'Use NEW_VAR instead.'. Boot logs a warning while the variable is still set.
   * Also put a `@deprecated` JSDoc tag on the key so editors strike through `env.X` usages.
   */
  deprecated?: string;
}

/**
 * - string (default): returned as-is, including an empty string, like `process.env`.
 *   With a `default`, unset and empty both read as the default.
 * - number: unset, empty or not a finite number reads as the default (or undefined).
 * - boolean: `true` only for 'true', `false` only for 'false', anything else reads as the default (or false).
 */
export type EnvVarDefinition =
  | (EnvVarBase & { type?: 'string'; default?: string })
  | (EnvVarBase & { type: 'number'; default?: number })
  | (EnvVarBase & { type: 'boolean'; default?: boolean });

type EnvSchema = Readonly<Record<string, EnvVarDefinition>>;

type EnvValue<T extends EnvVarDefinition> = T extends { type: 'number' }
  ? number
  : T extends { type: 'boolean' }
    ? boolean
    : string;

export type Env<S extends EnvSchema> = {
  readonly [K in keyof S]: S[K] extends { type: 'boolean' } | { default: string | number }
    ? EnvValue<S[K]>
    : EnvValue<S[K]> | undefined;
};

function readEnvVar(name: string, definition: EnvVarDefinition): string | number | boolean | undefined {
  const raw = process.env[name];

  if (definition.type === 'number') {
    const value = raw ? Number(raw) : Number.NaN;

    return Number.isFinite(value) ? value : definition.default;
  }

  if (definition.type === 'boolean') {
    if (raw === 'true' || raw === 'false') {
      return raw === 'true';
    }

    return definition.default ?? false;
  }

  if (raw === undefined || (raw === '' && definition.default !== undefined)) {
    return definition.default;
  }

  return raw;
}

/**
 * Builds a typed, read-only view of `schema`. Every read parses the current `process.env`
 * value, so secrets hydrated at boot and values set by tests are always picked up.
 */
export function createEnv<S extends EnvSchema>(schema: S): Env<S> {
  const properties: PropertyDescriptorMap = {};

  for (const [name, definition] of Object.entries(schema)) {
    properties[name] = { enumerable: true, get: () => readEnvVar(name, definition) };
  }

  return Object.defineProperties({}, properties) as Env<S>;
}

/** Typed access to the shared variables in `env.schema.ts`. Apps read through their own `config/env.ts`. */
export const env = createEnv(envSchema);

function warnDeprecatedEnv(schema: EnvSchema): void {
  for (const [name, definition] of Object.entries(schema)) {
    if (definition.deprecated && process.env[name]) {
      console.warn(`[Env] ${name} is deprecated and still set. ${definition.deprecated}`);
    }
  }
}

/**
 * Builds an app's `env` from the shared schema plus the variables only that app reads.
 * Redeclaring a shared key does not compile.
 *
 * `warnDeprecatedEnv`: call once at boot, after secrets are hydrated. Logs the name of each
 * deprecated variable that is still set, never its value.
 *
 * `env` is typed as two `Env`s because `Env<typeof envSchema & S>` collapses to `never` for apps
 * compiled with strictNullChecks, like the worker.
 */
export function createAppEnv<S extends EnvSchema & { readonly [K in keyof typeof envSchema]?: never }>(
  appSchema: S
): { env: Env<typeof envSchema> & Env<S>; warnDeprecatedEnv: () => void } {
  const schema = { ...envSchema, ...appSchema };

  return { env: createEnv(schema), warnDeprecatedEnv: () => warnDeprecatedEnv(schema) };
}
