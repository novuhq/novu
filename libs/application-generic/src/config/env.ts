import { envSchema } from './env.schema';

/** The backend services that check their variables at boot. */
export type EnvService = 'api' | 'worker' | 'ws' | 'inbound-mail';

/** When a boot rule applies. `ENV_CONDITIONS` in `env-validation.ts` decides and describes each one. */
export type EnvCondition =
  | 'bullmq'
  | 'bullmq-without-cluster-mode'
  | 'local-or-test'
  | 'novu-cloud'
  | 'standalone-redis'
  | 'storage-aws'
  | 'storage-azure'
  | 'storage-gcs'
  | 'thalamus';

/**
 * How boot checks a set value, with envalid. Without it, `type` decides: numbers and booleans are
 * checked, strings accept any value. envalid's checks are looser than the `env.X` parsing: a boolean
 * also accepts 1, yes, on and their opposites, and a number accepts what `parseFloat` reads.
 */
export type EnvFormat = 'boolean' | 'json' | 'number' | 'port' | 'tls-flag' | 'url';

/**
 * How one service checks a variable at boot:
 * - 'checked': a set value must match the entry's format and choices.
 * - 'required': the variable must also be set.
 * - An object, for a rule that depends on a condition or differs for this service.
 */
export type EnvBootRule =
  | 'checked'
  | 'required'
  | {
      /** `true`, or a condition under which the variable must be set. Otherwise it is only checked. */
      required?: boolean | EnvCondition;
      /** The rule applies only under this condition. Otherwise boot ignores the variable. */
      when?: EnvCondition;
      /** Replaces the entry's `choices` for this service. */
      choices?: readonly string[];
      /** Exact number of characters. */
      length?: number;
    };

interface EnvVarBase {
  /** What the variable controls. */
  description: string;
  /**
   * Migration hint, e.g. 'Use NEW_VAR instead.'. The entry gets no `env.X`, so new code can't read it,
   * and boot logs a warning while the variable is still set. Give the replacement `replaces`, and put a
   * `@deprecated` JSDoc tag on the key.
   */
  deprecated?: string;
  /** How boot checks a set value, when `type` doesn't say. */
  format?: EnvFormat;
  /** The only values boot accepts. */
  choices?: readonly string[];
  /** The services that check the variable at boot, and how. A service that isn't listed ignores it. */
  boot?: Partial<Record<EnvService, EnvBootRule>>;
}

interface ReadEnvVarBase extends EnvVarBase {
  readBy?: never;
  /**
   * Deprecated name of this variable, so deployments that still set only the old name keep working:
   * while this one is unset or empty, `env.X` reads the old one. A boolean reads `true` when either name
   * is 'true', because committed env files can set the new name to 'false' under a deployment's old one.
   */
  replaces?: string;
}

/**
 * A variable our code reads through `env.X`:
 * - string (default): returned as-is, including an empty string, like `process.env`.
 *   With a `default`, unset and empty both read as the default.
 * - number: unset, empty or not a finite number reads as the default (or undefined).
 * - boolean: `true` only for 'true', `false` only for 'false', anything else reads as the default (or false).
 */
type ReadEnvVarDefinition =
  | (ReadEnvVarBase & { type?: 'string'; default?: string })
  | (ReadEnvVarBase & { type: 'number'; default?: number })
  | (ReadEnvVarBase & { type: 'boolean'; default?: boolean });

/**
 * A variable only dependencies read, such as '@novu/dal', '@novu/framework', an enterprise package
 * or an SDK. It is declared so the app's variables are all in one place, but it has no `env.X`,
 * type or default: the description says what the dependency does with it, including its default.
 */
interface DependencyEnvVarDefinition extends EnvVarBase {
  /**
   * What reads the variable instead of our code. A workspace package ('@novu/…') must still read it,
   * which `src/config/env.spec.ts` checks in each app that depends on that package. Anything else,
   * such as an SDK, is documentation.
   */
  readBy: readonly string[];
  type?: never;
  default?: never;
  replaces?: never;
}

export type EnvVarDefinition = ReadEnvVarDefinition | DependencyEnvVarDefinition;

export type EnvSchema = Readonly<Record<string, EnvVarDefinition>>;

type EnvValue<T extends EnvVarDefinition> = T extends { type: 'number' }
  ? number
  : T extends { type: 'boolean' }
    ? boolean
    : string;

/** Entries without `env.X`: read only by dependencies, or deprecated. */
type HiddenEnvVar = { readBy: readonly string[] } | { deprecated: string };

export type Env<S extends EnvSchema> = {
  readonly [K in keyof S as S[K] extends HiddenEnvVar ? never : K]: S[K] extends
    | { type: 'boolean' }
    | { default: string | number }
    ? EnvValue<S[K]>
    : EnvValue<S[K]> | undefined;
};

function readRawEnvVar(name: string, definition: ReadEnvVarDefinition): string | undefined {
  const raw = process.env[name];
  const fallsBack = definition.type === 'boolean' ? raw !== 'true' : raw === undefined || raw === '';

  return definition.replaces && fallsBack ? process.env[definition.replaces] : raw;
}

function readEnvVar(name: string, definition: ReadEnvVarDefinition): string | number | boolean | undefined {
  const raw = readRawEnvVar(name, definition);

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

function hasEnvGetter(definition: EnvVarDefinition): definition is ReadEnvVarDefinition {
  return definition.readBy === undefined && definition.deprecated === undefined;
}

/**
 * One getter per variable our code reads, so every read parses the current `process.env` value.
 * Callers type the result with `Env`.
 */
export function defineEnv(schema: EnvSchema): object {
  const properties: PropertyDescriptorMap = {};

  for (const [name, definition] of Object.entries(schema)) {
    if (hasEnvGetter(definition)) {
      properties[name] = { enumerable: true, get: () => readEnvVar(name, definition) };
    }
  }

  return Object.defineProperties({}, properties);
}

/**
 * Builds a typed, read-only view of `schema`, without the variables only dependencies read and the
 * deprecated ones. Every read parses the current `process.env` value, so secrets hydrated at boot and
 * values set by tests are always picked up.
 */
export function createEnv<S extends EnvSchema>(schema: S): Env<S> {
  return defineEnv(schema) as Env<S>;
}

/** Typed access to the shared variables in `env.schema.ts`. Apps read through their own `config/env.ts`. */
export const env: Env<typeof envSchema> = createEnv(envSchema);
