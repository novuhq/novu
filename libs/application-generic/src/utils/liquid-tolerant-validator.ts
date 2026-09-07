import { LIQUID_TEMPLATE_PATTERN, selectDiscriminatedErrors } from '@novu/shared';
import type { AnySchemaObject, ErrorObject } from 'ajv';
import { JSONSchemaDto } from '../dtos/json-schema.dto';
import { createSchemaValidationAjv } from './issues';

/**
 * Absolute location of every subschema object, so an error can be traced back to where its
 * subschema actually lives in the document.
 *
 * A subschema reachable from more than one place has no single location, and guessing one would
 * silently attribute its errors to the wrong branch. Those are dropped from the index instead, so
 * their errors keep the path AJV reported: noisier output, never wrong output.
 */
function buildSchemaPathIndex(schema: JSONSchemaDto): Map<object, string> {
  const index = new Map<object, string>();
  const ambiguous = new Set<object>();

  const walk = (node: unknown, path: string) => {
    if (node === null || typeof node !== 'object') {
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((child, position) => {
        walk(child, `${path}/${position}`);
      });

      return;
    }

    if (index.has(node)) {
      ambiguous.add(node);
    } else {
      index.set(node, path);
    }

    for (const [key, child] of Object.entries(node)) {
      walk(child, `${path}/${key.replace(/~/g, '~0').replace(/\//g, '~1')}`);
    }
  };

  walk(schema, '#');

  for (const node of ambiguous) {
    index.delete(node);
  }

  return index;
}

function resolveSchemaPointer(schema: JSONSchemaDto, pointer: string): unknown {
  if (!pointer.startsWith('#/')) {
    return pointer === '#' ? schema : undefined;
  }

  return pointer
    .slice(2)
    .split('/')
    .reduce<unknown>((node, rawSegment) => {
      if (node === null || typeof node !== 'object') {
        return undefined;
      }

      return (node as Record<string, unknown>)[rawSegment.replace(/~1/g, '/').replace(/~0/g, '~')];
    }, schema);
}

/**
 * AJV re-bases `schemaPath` on the referenced schema whenever it crosses a `$ref` it compiled
 * separately, so unrelated subschemas report colliding paths like `#/anyOf/0/additionalProperties`.
 * Branch selection needs paths that are unique across the document, so any error whose path no
 * longer points at its own subschema is re-anchored on where that subschema really sits.
 */
function toAbsoluteSchemaPaths(
  errors: ErrorObject[],
  schema: JSONSchemaDto,
  pathIndex: Map<object, string>
): ErrorObject[] {
  return errors.map((error) => {
    const parentSchema = error.parentSchema as AnySchemaObject | undefined;
    const keywordIndex = error.schemaPath.lastIndexOf('/');
    const reportedParentPath = error.schemaPath.slice(0, keywordIndex);

    if (!parentSchema || keywordIndex < 0 || resolveSchemaPointer(schema, reportedParentPath) === parentSchema) {
      return error;
    }

    const absolutePath = pathIndex.get(parentSchema);

    if (!absolutePath) {
      return error;
    }

    return { ...error, schemaPath: `${absolutePath}${error.schemaPath.slice(keywordIndex)}` };
  });
}

/**
 * The tolerance transform adds a "or a Liquid template" branch beside every concrete one, so a
 * value that is neither reports a "must be string" for that branch as well. Never actionable: the
 * user did not write a template, and the concrete branch's error already says what is wrong.
 */
function isLiquidToleranceBranchError(error: ErrorObject): boolean {
  const parentSchema = error.parentSchema as AnySchemaObject | undefined;

  return parentSchema?.type === 'string' && parentSchema?.pattern === LIQUID_TEMPLATE_PATTERN;
}

function isCompositionError(error: ErrorObject): boolean {
  return error.keyword === 'anyOf' || error.keyword === 'oneOf';
}

/** "must match a schema in anyOf" says nothing once a concrete failure is reported underneath it. */
function dropRedundantCompositionErrors(errors: ErrorObject[]): ErrorObject[] {
  const explainedPaths = new Set<string>();

  for (const error of errors) {
    if (isCompositionError(error)) {
      continue;
    }

    // A concrete failure explains its own node and every composition enclosing it.
    let path = error.instancePath;
    explainedPaths.add(path);
    while (path !== '') {
      path = path.slice(0, Math.max(0, path.lastIndexOf('/')));
      explainedPaths.add(path);
    }
  }

  return errors.filter((error) => !isCompositionError(error) || !explainedPaths.has(error.instancePath));
}

function dedupe(errors: ErrorObject[]): ErrorObject[] {
  const seen = new Set<string>();

  return errors.filter((error) => {
    const key = [error.instancePath, error.keyword, JSON.stringify(error.params), error.message].join('\u0000');
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);

    return true;
  });
}

/**
 * Validates a value that still has Liquid in it against a Liquid-tolerant schema, returning only
 * the errors worth showing. A union schema makes AJV report every branch it tried, which for
 * something like Slack's Block Kit is over a hundred errors for a single typo.
 *
 * The validator is stateful and expensive to build (the Slack schema is a few hundred kilobytes),
 * so callers are expected to build one per schema and keep it.
 */
export function createLiquidTolerantValidator(schema: JSONSchemaDto): (value: unknown) => ErrorObject[] {
  const validate = createSchemaValidationAjv({ verbose: true, schema }).compile(schema);
  const pathIndex = buildSchemaPathIndex(schema);

  return (value: unknown) => {
    if (validate(value)) {
      return [];
    }

    const absoluteErrors = toAbsoluteSchemaPaths(validate.errors ?? [], schema, pathIndex);
    const discriminated = selectDiscriminatedErrors(absoluteErrors, value, schema);

    return dedupe(
      dropRedundantCompositionErrors(discriminated.filter((error) => !isLiquidToleranceBranchError(error)))
    );
  };
}
