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
 * A variable our code reads through `env.X`:
 * - string (default): returned as-is, including an empty string, like `process.env`.
 *   With a `default`, unset and empty both read as the default.
 * - number: unset, empty or not a finite number reads as the default (or undefined).
 * - boolean: `true` only for 'true', `false` only for 'false', anything else reads as the default (or false).
 */
type ReadEnvVarDefinition =
  | (EnvVarBase & { type?: 'string'; default?: string; readBy?: never })
  | (EnvVarBase & { type: 'number'; default?: number; readBy?: never })
  | (EnvVarBase & { type: 'boolean'; default?: boolean; readBy?: never });

/**
 * A variable only a dependency reads, such as '@novu/dal', '@novu/framework', an enterprise package
 * or an SDK. It is declared so the app's variables are all in one place, but it has no `env.X`,
 * type or default: the description says what the dependency does with it, including its default.
 */
interface DependencyEnvVarDefinition extends EnvVarBase {
  /** The dependency that reads the variable, e.g. '@novu/dal'. */
  readBy: string;
  type?: never;
  default?: never;
}

export type EnvVarDefinition = ReadEnvVarDefinition | DependencyEnvVarDefinition;

type EnvSchema = Readonly<Record<string, EnvVarDefinition>>;

type EnvValue<T extends EnvVarDefinition> = T extends { type: 'number' }
  ? number
  : T extends { type: 'boolean' }
    ? boolean
    : string;

export type Env<S extends EnvSchema> = {
  readonly [K in keyof S as S[K] extends { readBy: string } ? never : K]: S[K] extends
    | { type: 'boolean' }
    | { default: string | number }
    ? EnvValue<S[K]>
    : EnvValue<S[K]> | undefined;
};

function readEnvVar(name: string, definition: ReadEnvVarDefinition): string | number | boolean | undefined {
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

function isReadByDependency(definition: EnvVarDefinition): definition is DependencyEnvVarDefinition {
  return definition.readBy !== undefined;
}

/** One getter per variable our code reads, so every read parses the current `process.env` value. */
function defineEnv(schema: EnvSchema): object {
  const properties: PropertyDescriptorMap = {};

  for (const [name, definition] of Object.entries(schema)) {
    if (!isReadByDependency(definition)) {
      properties[name] = { enumerable: true, get: () => readEnvVar(name, definition) };
    }
  }

  return Object.defineProperties({}, properties);
}

/**
 * Builds a typed, read-only view of `schema`, without the variables only a dependency reads.
 * Every read parses the current `process.env` value, so secrets hydrated at boot and values
 * set by tests are always picked up.
 */
export function createEnv<S extends EnvSchema>(schema: S): Env<S> {
  return defineEnv(schema) as Env<S>;
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

  return {
    env: defineEnv(schema) as Env<typeof envSchema> & Env<S>,
    warnDeprecatedEnv: () => warnDeprecatedEnv(schema),
  };
}
