import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { cloneDeep } from 'es-toolkit/compat';

export const FRAMEWORK_EMPTY_STEP_RESOLVER_SCHEMA = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
} as const;

const FIELD_REMOVAL_KEYWORDS = new Set([
  'type',
  'enum',
  'const',
  'format',
  'pattern',
  'minLength',
  'maxLength',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'minItems',
  'maxItems',
  'uniqueItems',
  'anyOf',
  'oneOf',
  'allOf',
  'not',
]);

export function isStepResolverActive(stepResolverHash?: string): boolean {
  return typeof stepResolverHash === 'string' && stepResolverHash.length > 0;
}

export function getStepResolverControlSchema(controlSchema?: Record<string, unknown> | null): Record<string, unknown> {
  return controlSchema ?? FRAMEWORK_EMPTY_STEP_RESOLVER_SCHEMA;
}

// When a step resolver is redeployed, the schema can change while old control values
// still exist in the database. This removes values that no longer match the current
// schema so the resolver does not keep using hidden stale inputs.
export function reconcileStepResolverControlValues(
  controlValues: Record<string, unknown> | null | undefined,
  controlSchema: Record<string, unknown>
): Record<string, unknown> {
  const ajv = new Ajv({
    allErrors: true,
    useDefaults: false,
    strict: false,
  });

  addFormats(ajv);

  const validate = ajv.compile(controlSchema);
  let reconciledControlValues = cloneDeep(isPlainObject(controlValues) ? controlValues : {});

  while (true) {
    const isValid = validate(reconciledControlValues);
    const errors = (validate.errors ?? []) as ErrorObject[];

    if (isValid || errors.length === 0 || errors.every((error) => error.keyword === 'required')) {
      break;
    }

    let removedInvalidValue = false;

    for (const error of errors) {
      const removablePath = getRemovableJsonPointer(error);
      if (!removablePath) {
        continue;
      }

      removedInvalidValue = removeAtJsonPointer(reconciledControlValues, removablePath) || removedInvalidValue;
    }

    // If we cannot isolate the invalid field/path, clear resolver inputs rather than keep stale hidden values.
    if (!removedInvalidValue) {
      reconciledControlValues = {};
      break;
    }
  }

  return reconciledControlValues;
}

function getRemovableJsonPointer(error: ErrorObject): string | undefined {
  if (error.keyword === 'required') {
    return undefined;
  }

  if (error.keyword === 'additionalProperties') {
    const additionalProperty = (error.params as { additionalProperty?: string }).additionalProperty;
    if (!additionalProperty) {
      return undefined;
    }

    return `${error.instancePath}/${escapeJsonPointerSegment(additionalProperty)}`;
  }

  if (FIELD_REMOVAL_KEYWORDS.has(error.keyword)) {
    return error.instancePath || undefined;
  }

  return undefined;
}

function removeAtJsonPointer(target: Record<string, unknown>, jsonPointer: string): boolean {
  if (!jsonPointer || jsonPointer === '/') {
    return false;
  }

  const segments = jsonPointer
    .split('/')
    .slice(1)
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));

  if (segments.length === 0) {
    return false;
  }

  let parent: unknown = target;

  for (const segment of segments.slice(0, -1)) {
    if (Array.isArray(parent)) {
      const index = Number(segment);
      if (!Number.isInteger(index) || index < 0 || index >= parent.length) {
        return false;
      }

      parent = parent[index];
      continue;
    }

    if (!isPlainObject(parent) || !(segment in parent)) {
      return false;
    }

    parent = parent[segment];
  }

  const lastSegment = segments[segments.length - 1];

  if (Array.isArray(parent)) {
    const index = Number(lastSegment);
    if (!Number.isInteger(index) || index < 0 || index >= parent.length) {
      return false;
    }

    parent.splice(index, 1);

    return true;
  }

  if (!isPlainObject(parent) || !(lastSegment in parent)) {
    return false;
  }

  delete parent[lastSegment];

  return true;
}

function escapeJsonPointerSegment(segment: string): string {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
