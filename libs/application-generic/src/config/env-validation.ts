import { FeatureFlagsKeysEnum } from '@novu/shared';
import { bool, cleanEnv, json, makeValidator, num, port, str, url, type ValidatorSpec } from 'envalid';
import { parseTlsFlagEnvValue } from '../services/in-memory-provider/providers/variable-mappers';
import { isClusterModeEnabled } from '../services/in-memory-provider/utils';
import type { EnvBootRule, EnvCondition, EnvFormat, EnvSchema, EnvService, EnvVarDefinition } from './env';
import { createThrowingEnvReporter } from './env-reporter';
import {
  assertQueueBackendConfig,
  type IQueueBackendRequirements,
  isBullMqEnabled,
  requiresStandaloneRedis,
} from './queue-backend';

interface EnvConditionDefinition {
  /** Completes "when …" in the generated reference. */
  description: string;
  applies: (raw: NodeJS.ProcessEnv) => boolean;
}

function storageService(raw: NodeJS.ProcessEnv): string {
  return (raw.STORAGE_SERVICE || '').toUpperCase();
}

export const ENV_CONDITIONS: Record<EnvCondition, EnvConditionDefinition> = {
  bullmq: {
    description: 'BullMQ runs (QUEUE_BACKEND is bullmq or sqs_bullmq)',
    applies: () => isBullMqEnabled(),
  },
  'bullmq-without-cluster-mode': {
    description: 'BullMQ runs and Redis cluster mode is off',
    applies: () => isBullMqEnabled() && !isClusterModeEnabled(),
  },
  'local-or-test': {
    description: 'NODE_ENV is local or test',
    applies: (raw) => ['local', 'test'].includes(raw.NODE_ENV ?? ''),
  },
  'novu-cloud': {
    description: 'on Novu Cloud (NOVU_ENTERPRISE=true without IS_SELF_HOSTED=true)',
    applies: (raw) => raw.IS_SELF_HOSTED !== 'true' && raw.NOVU_ENTERPRISE === 'true',
  },
  'standalone-redis': {
    description: 'standalone Redis is used (cluster mode off, or BullMQ still running)',
    applies: () => requiresStandaloneRedis(),
  },
  'storage-aws': { description: 'STORAGE_SERVICE=AWS', applies: (raw) => storageService(raw) === 'AWS' },
  'storage-azure': { description: 'STORAGE_SERVICE=AZURE', applies: (raw) => storageService(raw) === 'AZURE' },
  'storage-gcs': { description: 'STORAGE_SERVICE=GCS', applies: (raw) => storageService(raw) === 'GCS' },
  thalamus: { description: 'THALAMUS_CF_URL is set', applies: (raw) => Boolean(raw.THALAMUS_CF_URL) },
};

/** A boot rule resolved for the current environment. */
export interface EnvCheck {
  format: EnvFormat | 'string';
  required: boolean;
  choices?: readonly string[];
  length?: number;
}

/** The format boot checks a variable against: `format`, else what `type` reads, else any string. */
export function envFormatOf(definition: EnvVarDefinition): EnvFormat | 'string' {
  if (definition.format) {
    return definition.format;
  }

  return definition.type === 'number' || definition.type === 'boolean' ? definition.type : 'string';
}

/** `rule` as an object, so callers handle one form. */
export function expandEnvBootRule(rule: EnvBootRule): Exclude<EnvBootRule, string> {
  return typeof rule === 'string' ? { required: rule === 'required' } : rule;
}

/** What boot checks for one variable under the current environment, or undefined when it ignores it. */
function resolveEnvCheck(
  definition: EnvVarDefinition,
  rule: EnvBootRule,
  raw: NodeJS.ProcessEnv
): EnvCheck | undefined {
  const { required, when, choices, length } = expandEnvBootRule(rule);

  if (when && !ENV_CONDITIONS[when].applies(raw)) {
    return undefined;
  }

  return {
    format: envFormatOf(definition),
    required: typeof required === 'string' ? ENV_CONDITIONS[required].applies(raw) : Boolean(required),
    choices: choices ?? definition.choices,
    length,
  };
}

const tlsFlag = makeValidator(parseTlsFlagEnvValue);

function exactLength(length: number) {
  return makeValidator((value) => {
    if (value.length !== length) {
      throw new Error(`Expected ${length} characters`);
    }

    return value;
  });
}

function requiredValidatorSpec(format: EnvCheck['format']): ValidatorSpec<unknown> {
  switch (format) {
    case 'boolean':
      return bool();
    case 'json':
      return json();
    case 'number':
      return num();
    case 'port':
      return port();
    case 'tls-flag':
      return tlsFlag();
    case 'url':
      return url();
    default:
      return str();
  }
}

/** The envalid spec for a check. envalid treats a spec with a `default` key, even `undefined`, as optional. */
function toValidatorSpec(check: EnvCheck): ValidatorSpec<unknown> {
  const required = check.length === undefined ? requiredValidatorSpec(check.format) : exactLength(check.length)();
  const spec: ValidatorSpec<unknown> = check.required ? { ...required } : { ...required, default: undefined };

  if (check.choices) {
    spec.choices = check.choices;
  }

  return spec;
}

/**
 * The feature flag family: every `FeatureFlagsKeysEnum` key can be set as a variable, and boot checks
 * the ones that read as numbers (`*_NUMBER`, MAX_ENVIRONMENT_COUNT) or booleans (`IS_*`).
 */
function featureFlagValidators(): Record<string, ValidatorSpec<unknown>> {
  const validators: Record<string, ValidatorSpec<unknown>> = {};

  for (const key of Object.values(FeatureFlagsKeysEnum)) {
    if (key.endsWith('_NUMBER') || key === FeatureFlagsKeysEnum.MAX_ENVIRONMENT_COUNT) {
      validators[key] = num({ default: undefined });
    } else if (key.startsWith('IS_')) {
      validators[key] = bool({ default: undefined });
    }
  }

  return validators;
}

export interface EnvValidationOptions {
  /** Also checks the feature flag family. */
  checkFeatureFlags?: boolean;
  /** The queues the service uses, which decide the queue backend settings it needs. */
  queueBackend: IQueueBackendRequirements;
}

/**
 * Checks `process.env` against `service`'s `boot` rules in `schema`, then its queue backend settings.
 * Throws one error that lists every variable that is missing or invalid, by name and failure kind only,
 * never the value.
 */
export function validateEnvSchema(service: EnvService, schema: EnvSchema, options: EnvValidationOptions): void {
  // biome-ignore lint/plugin: boot validation checks the raw environment, before anything reads it
  const raw = process.env;
  const validators = options.checkFeatureFlags ? featureFlagValidators() : {};

  for (const [name, definition] of Object.entries(schema)) {
    const rule = definition.boot?.[service];
    const check = rule && resolveEnvCheck(definition, rule, raw);

    if (check) {
      validators[name] = toValidatorSpec(check);
    }
  }

  cleanEnv(raw, validators, { reporter: createThrowingEnvReporter(service) });
  assertQueueBackendConfig(options.queueBackend);
}
