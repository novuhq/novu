import type { JSONSchemaDefinition, JSONSchemaDto } from '../../../dto/workflows/json-schema-dto';

/** Matches the opening delimiter of a Liquid output (`{{`) or tag (`{%`). */
export const LIQUID_TEMPLATE_PATTERN = '\\{\\{|\\{%';

const liquidStringSchema: JSONSchemaDto = { type: 'string', pattern: LIQUID_TEMPLATE_PATTERN };

function acceptsAnyString(schema: JSONSchemaDto): boolean {
  // Every definition is rewritten, so a reference already resolves to a tolerant schema.
  if (schema.$ref !== undefined) {
    return true;
  }

  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (!types.includes('string')) {
    return false;
  }

  return schema.enum === undefined && schema.const === undefined && schema.pattern === undefined;
}

function transformDefinition(definition: JSONSchemaDefinition): JSONSchemaDefinition {
  if (typeof definition === 'boolean') {
    return definition;
  }

  return toLiquidTolerantSchema(definition);
}

function transformRecord(record: Readonly<Record<string, JSONSchemaDefinition>>): Record<string, JSONSchemaDefinition> {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, transformDefinition(value)]));
}

/**
 * Composition members are rewritten without their own template branch: the enclosing
 * composition node already carries one, and a per-member branch would make a template
 * string satisfy several `oneOf` members at once.
 */
function transformComposition(members: JSONSchemaDefinition[]): JSONSchemaDefinition[] {
  return members.map((member) => (typeof member === 'boolean' ? member : transformChildren(member)));
}

function transformChildren(schema: JSONSchemaDto): JSONSchemaDto {
  const next: JSONSchemaDto = { ...schema };

  if (next.anyOf) {
    next.anyOf = transformComposition(next.anyOf);
  }

  if (next.oneOf) {
    next.oneOf = transformComposition(next.oneOf);
  }

  if (next.allOf) {
    next.allOf = transformComposition(next.allOf);
  }

  if (next.properties) {
    next.properties = transformRecord(next.properties);
  }

  if (next.patternProperties) {
    next.patternProperties = transformRecord(next.patternProperties);
  }

  if (next.definitions) {
    next.definitions = transformRecord(next.definitions);
  }

  if (next.additionalProperties !== undefined) {
    next.additionalProperties = transformDefinition(next.additionalProperties);
  }

  if (Array.isArray(next.items)) {
    next.items = next.items.map(transformDefinition);
  } else if (next.items !== undefined) {
    next.items = transformDefinition(next.items);
  }

  return next;
}

/**
 * Overrides are persisted with Liquid still in them and only compiled at send time, so the raw
 * stored value has to validate against a schema that also accepts a template wherever a concrete
 * value is expected. `additionalProperties: false` is preserved throughout: catching a typo'd key
 * is the reason deep validation is worth doing at all.
 */
export function toLiquidTolerantSchema(schema: JSONSchemaDto): JSONSchemaDto {
  if (acceptsAnyString(schema)) {
    return schema;
  }

  // `$ref` pointers are absolute (`#/definitions/...`), so definitions are hoisted onto the
  // wrapper rather than buried inside its first branch.
  const { definitions, ...rest } = transformChildren(schema);
  const wrapped: JSONSchemaDto = { anyOf: [rest, { ...liquidStringSchema }] };

  return definitions === undefined ? wrapped : { definitions, ...wrapped };
}

/** Structural subset of AJV's `ErrorObject`, so this package needs no AJV dependency. */
export type SchemaValidationErrorLike = {
  instancePath: string;
  schemaPath: string;
  keyword: string;
  message?: string;
};

type CompositionSegment = {
  /** Schema path up to and including the composition keyword, e.g. `#/properties/blocks/anyOf`. */
  site: string;
  branchIndex: string;
};

function compositionSegments(schemaPath: string): CompositionSegment[] {
  const pattern = /\/(anyOf|oneOf)\/(\d+)(?=\/|$)/g;
  const segments: CompositionSegment[] = [];

  let match = pattern.exec(schemaPath);
  while (match) {
    segments.push({
      site: `${schemaPath.slice(0, match.index)}/${match[1]}`,
      branchIndex: match[2] as string,
    });
    match = pattern.exec(schemaPath);
  }

  return segments;
}

/**
 * How many levels the schema path descends into the instance after the branch it belongs to,
 * so the composition node's own instance path can be recovered from a nested error.
 */
function instanceDepthOfSchemaSuffix(suffix: string): number {
  const tokens = suffix.split('/').filter(Boolean);
  let depth = 0;
  let index = 0;

  while (index < tokens.length) {
    const token = tokens[index] as string;

    if (token === 'properties' || token === 'patternProperties') {
      depth += 1;
      index += 2;
    } else if (token === 'anyOf' || token === 'oneOf' || token === 'allOf') {
      index += 2;
    } else if ((token === 'items' || token === 'additionalProperties') && index < tokens.length - 1) {
      depth += 1;
      index += 1;
    } else {
      index += 1;
    }
  }

  return depth;
}

function dropTrailingSegments(instancePath: string, count: number): string {
  if (count <= 0) {
    return instancePath;
  }

  const segments = instancePath.split('/');

  return segments.slice(0, Math.max(1, segments.length - count)).join('/');
}

function isInstancePathPrefix(prefix: string, path: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function isOnSameInstanceChain(a: string, b: string): boolean {
  return isInstancePathPrefix(a, b) || isInstancePathPrefix(b, a);
}

function resolveInstancePath(data: unknown, instancePath: string): unknown {
  if (instancePath === '') {
    return data;
  }

  return instancePath
    .slice(1)
    .split('/')
    .reduce<unknown>((current, rawSegment) => {
      if (current === null || typeof current !== 'object') {
        return undefined;
      }
      const segment = rawSegment.replace(/~1/g, '/').replace(/~0/g, '~');

      return (current as Record<string, unknown>)[segment];
    }, data);
}

function hasStringTypeField(value: unknown): boolean {
  return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string';
}

/** The `type` const/enum mismatch AJV reports on a branch the value was never meant for. */
function isDiscriminatorMismatch(error: SchemaValidationErrorLike, branchPrefix: string): boolean {
  if (error.keyword !== 'const' && error.keyword !== 'enum') {
    return false;
  }

  return error.schemaPath.startsWith(`${branchPrefix}/properties/type/`);
}

type BranchGroup = {
  site: string;
  branchPrefix: string;
  nodeInstancePath: string;
  hasDiscriminatorMismatch: boolean;
};

type DiscriminatedSite = {
  selectedBranchPrefix: string;
  nodeInstancePath: string;
};

function groupBranches<TError extends SchemaValidationErrorLike>(errors: readonly TError[]): BranchGroup[] {
  const groups = new Map<string, BranchGroup>();

  for (const error of errors) {
    for (const { site, branchIndex } of compositionSegments(error.schemaPath)) {
      const branchPrefix = `${site}/${branchIndex}`;
      const suffix = error.schemaPath.slice(branchPrefix.length);
      const nodeInstancePath = dropTrailingSegments(error.instancePath, instanceDepthOfSchemaSuffix(suffix));
      const key = `${branchPrefix}\u0000${nodeInstancePath}`;
      const group = groups.get(key) ?? {
        site,
        branchPrefix,
        nodeInstancePath,
        hasDiscriminatorMismatch: false,
      };

      group.hasDiscriminatorMismatch ||= isDiscriminatorMismatch(error, branchPrefix);
      groups.set(key, group);
    }
  }

  return [...groups.values()];
}

function findDiscriminatedSites<TError extends SchemaValidationErrorLike>(
  errors: readonly TError[],
  dataAtPath: unknown
): DiscriminatedSite[] {
  const bySite = new Map<string, BranchGroup[]>();

  for (const group of groupBranches(errors)) {
    const key = `${group.site}\u0000${group.nodeInstancePath}`;
    bySite.set(key, [...(bySite.get(key) ?? []), group]);
  }

  const sites: DiscriminatedSite[] = [];

  for (const groups of bySite.values()) {
    const matched = groups.filter((group) => !group.hasDiscriminatorMismatch);
    const selected = matched[0];
    const isDiscriminated = matched.length === 1 && groups.length > matched.length;

    if (
      !isDiscriminated ||
      !selected ||
      !hasStringTypeField(resolveInstancePath(dataAtPath, selected.nodeInstancePath))
    ) {
      continue;
    }

    sites.push({ selectedBranchPrefix: selected.branchPrefix, nodeInstancePath: selected.nodeInstancePath });
  }

  return sites;
}

function isShadowedBy(error: SchemaValidationErrorLike, site: DiscriminatedSite): boolean {
  if (!isOnSameInstanceChain(error.instancePath, site.nodeInstancePath)) {
    return false;
  }

  const { selectedBranchPrefix } = site;
  if (error.schemaPath === selectedBranchPrefix || error.schemaPath.startsWith(`${selectedBranchPrefix}/`)) {
    return false;
  }

  const isCompositionKeyword = error.keyword === 'anyOf' || error.keyword === 'oneOf';
  if (isCompositionKeyword && selectedBranchPrefix.startsWith(`${error.schemaPath}/`)) {
    return true;
  }

  return compositionSegments(selectedBranchPrefix).some(({ site: chainSite, branchIndex }) => {
    if (!error.schemaPath.startsWith(`${chainSite}/`)) {
      return false;
    }
    const [errorBranchIndex] = error.schemaPath.slice(chainSite.length + 1).split('/');

    return errorBranchIndex !== undefined && /^\d+$/.test(errorBranchIndex) && errorBranchIndex !== branchIndex;
  });
}

/**
 * AJV reports every branch of a union, so one typo inside a Block Kit block yields a useless
 * "must match a schema in anyOf" plus the failures of every other block type it tried. When the
 * failing node carries a `type` that lines up with exactly one branch, this keeps only that
 * branch's errors and drops the rejected siblings and the enclosing composition noise.
 *
 * `dataAtPath` is the value the errors were produced against; `instancePath`s resolve against it.
 */
export function selectDiscriminatedErrors<TError extends SchemaValidationErrorLike>(
  errors: readonly TError[],
  dataAtPath: unknown
): TError[] {
  const sites = findDiscriminatedSites(errors, dataAtPath);

  if (sites.length === 0) {
    return [...errors];
  }

  return errors.filter((error) => !sites.some((site) => isShadowedBy(error, site)));
}
