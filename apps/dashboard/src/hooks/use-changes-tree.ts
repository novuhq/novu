import { useMemo } from 'react';
import type { IResourceDiffResult } from '@/api/environments';

export type ChangeStatus = 'added' | 'modified' | 'deleted' | 'breaking';

export type ChangeGroupType = 'workflow' | 'layout' | 'agent';

export type ChangeDiffStat = {
  added: number;
  deleted: number;
};

export type ChangeRow = {
  id: string;
  name: string;
  status: ChangeStatus;
  /**
   * True when a nested change can stop triggers that already work in production.
   * A collapsed row shows Breaking in place of its own Modified status.
   */
  hasBreakingDescendant: boolean;
  diffStat?: ChangeDiffStat;
  resource: IResourceDiffResult;
};

export type ChangeGroup = {
  type: ChangeGroupType;
  label: string;
  rows: ChangeRow[];
};

export type RequiredByResource = {
  id: string;
  name: string;
  resourceType: string;
};

export type ResourceSelectionState = {
  [resourceId: string]: {
    selected: boolean;
    disabled: boolean;
    /** Selected changes that force this one to stay selected. */
    requiredBy: RequiredByResource[];
    resource: IResourceDiffResult;
  };
};

export type UseChangesTreeResult = {
  workflows: ChangeGroup;
  layouts: ChangeGroup;
  agents: ChangeGroup;
};

// Nested diff entries come back typed as `changes: any[]` from the diff API (see
// IResourceDiffResult in api/environments.ts). Narrow the shape we actually rely on here.
export interface INestedResourceChange {
  resourceType: string;
  stepType?: string;
  action?: 'added' | 'modified' | 'deleted' | 'unchanged' | 'moved';
  previousIndex?: number;
  newIndex?: number;
  sourceResource?: { id: string | null; name: string | null } | null;
  targetResource?: { id: string | null; name: string | null } | null;
  diffs?: {
    previous?: Record<string, unknown> | null;
    new?: Record<string, unknown> | null;
  } | null;
}

type JsonSchema = {
  type?: string | string[];
  enum?: unknown[];
  const?: unknown;
  format?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
  minProperties?: number;
  required?: string[];
  properties?: Record<string, JsonSchema | boolean>;
  items?: JsonSchema | JsonSchema[] | boolean;
  additionalProperties?: JsonSchema | boolean;
  oneOf?: unknown;
  anyOf?: unknown;
  allOf?: unknown;
  not?: unknown;
};

function getResourceId(resource: IResourceDiffResult): string | undefined {
  return resource.sourceResource?.id || resource.targetResource?.id || undefined;
}

function getResourceName(resource: {
  sourceResource?: { name: string | null } | null;
  targetResource?: { name: string | null } | null;
}) {
  return resource.sourceResource?.name || resource.targetResource?.name || undefined;
}

function getResourceStatus(summary: IResourceDiffResult['summary']): ChangeStatus | undefined {
  if (summary.added > 0) return 'added';
  if (summary.modified > 0) return 'modified';
  if (summary.deleted > 0) return 'deleted';

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJsonSchema(value: unknown): value is JsonSchema {
  return isRecord(value);
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function schemaTypes(type: JsonSchema['type']): Set<string> | undefined {
  if (!type) return undefined;

  return new Set(Array.isArray(type) ? type : [type]);
}

function typesRejectPreviousValues(previous: JsonSchema['type'], next: JsonSchema['type']): boolean {
  const previousTypes = schemaTypes(previous);
  const nextTypes = schemaTypes(next);
  if (!nextTypes) return false;
  // A missing type accepts every JSON value, so adding one rejects values that used to pass.
  if (!previousTypes) return true;

  for (const type of previousTypes) {
    if (nextTypes.has(type)) continue;
    if (type === 'integer' && nextTypes.has('number')) continue;

    return true;
  }

  return false;
}

function boundTightened(previous: number | undefined, next: number | undefined, direction: 'min' | 'max'): boolean {
  if (next === undefined) return false;
  if (previous === undefined) return true;
  if (direction === 'min') return next > previous;

  return next < previous;
}

function enumRejectsPreviousValues(previous: JsonSchema, next: JsonSchema): boolean {
  if (!Array.isArray(next.enum)) return false;
  if (!Array.isArray(previous.enum)) return true;

  return previous.enum.some((value) => !next.enum?.some((allowed) => sameValue(allowed, value)));
}

function schemaRejectsSomePayload(schema: unknown): boolean {
  if (!isJsonSchema(schema)) return false;
  if ((schema.required?.length ?? 0) > 0) return true;
  if (schema.enum || schema.const !== undefined) return true;
  if ((schema.minProperties ?? 0) > 0) return true;

  const types = schemaTypes(schema.type);
  if (types && !types.has('object')) return true;

  return false;
}

function constRejectsPreviousValues(previous: JsonSchema, next: JsonSchema): boolean {
  return next.const !== undefined && !sameValue(previous.const, next.const);
}

function formatRejectsPreviousValues(previous: JsonSchema, next: JsonSchema): boolean {
  return Boolean(next.format) && previous.format !== next.format;
}

function boundsRejectPreviousValues(previous: JsonSchema, next: JsonSchema): boolean {
  const checks: Array<[number | undefined, number | undefined, 'min' | 'max']> = [
    [previous.minimum, next.minimum, 'min'],
    [previous.maximum, next.maximum, 'max'],
    [previous.exclusiveMinimum, next.exclusiveMinimum, 'min'],
    [previous.exclusiveMaximum, next.exclusiveMaximum, 'max'],
    [previous.minLength, next.minLength, 'min'],
    [previous.maxLength, next.maxLength, 'max'],
    [previous.minItems, next.minItems, 'min'],
    [previous.maxItems, next.maxItems, 'max'],
  ];

  return checks.some(([previousBound, nextBound, direction]) => boundTightened(previousBound, nextBound, direction));
}

function patternRejectsPreviousValues(previous: JsonSchema, next: JsonSchema): boolean {
  return Boolean(next.pattern) && previous.pattern !== next.pattern;
}

function requiredRejectsPreviousValues(previous: JsonSchema, next: JsonSchema): boolean {
  const previousRequired = new Set(previous.required ?? []);

  return (next.required ?? []).some((key) => !previousRequired.has(key));
}

function combinatorRejectsPreviousValues(previous: JsonSchema, next: JsonSchema): boolean {
  const combinators: Array<[unknown, unknown]> = [
    [previous.oneOf, next.oneOf],
    [previous.anyOf, next.anyOf],
    [previous.allOf, next.allOf],
    [previous.not, next.not],
  ];

  return combinators.some(
    ([previousValue, nextValue]) => nextValue !== undefined && !sameValue(previousValue, nextValue)
  );
}

function keywordTypesReject(previous: JsonSchema, next: JsonSchema): boolean {
  return typesRejectPreviousValues(previous.type, next.type);
}

function additionalPropertiesReject(previous: JsonSchema, next: JsonSchema): boolean {
  if (next.additionalProperties === false && previous.additionalProperties !== false) return true;
  if (!isJsonSchema(previous.additionalProperties) || !isJsonSchema(next.additionalProperties)) return false;

  return schemaRejectsPreviousValues(previous.additionalProperties, next.additionalProperties);
}

function propertyRejectsPreviousValues(
  previous: JsonSchema | boolean | undefined,
  next: JsonSchema | boolean | undefined
): boolean {
  if (next === undefined || next === true || previous === false || previous === undefined) return false;
  if (next === false || previous === true) return true;

  return schemaRejectsPreviousValues(previous, next);
}

function propertiesRejectPreviousValues(previous: JsonSchema, next: JsonSchema): boolean {
  const previousProperties = previous.properties ?? {};
  const nextProperties = next.properties ?? {};
  const keys = new Set([...Object.keys(previousProperties), ...Object.keys(nextProperties)]);

  return [...keys].some((key) => {
    const previousProperty = previousProperties[key];
    if (previousProperty === undefined) {
      return addedPropertyRejectsPreviousValues(previous, nextProperties[key]);
    }

    return propertyRejectsPreviousValues(previousProperty, nextProperties[key]);
  });
}

/** A new property replaces values that additionalProperties used to accept. */
function addedPropertyRejectsPreviousValues(
  previous: JsonSchema,
  nextProperty: JsonSchema | boolean | undefined
): boolean {
  if (previous.additionalProperties === false) return false;
  if (nextProperty === undefined || nextProperty === true) return false;
  if (nextProperty === false) return true;
  if (!isJsonSchema(nextProperty)) return false;

  if (isJsonSchema(previous.additionalProperties)) {
    return schemaRejectsPreviousValues(previous.additionalProperties, nextProperty);
  }

  // Unconstrained additional properties accept any value. Annotations such as description do not reject any.
  return schemaRejectsPreviousValues({}, nextProperty);
}

function itemsRejectPreviousValues(previous: JsonSchema, next: JsonSchema): boolean {
  if (isJsonSchema(previous.items) && isJsonSchema(next.items)) {
    return schemaRejectsPreviousValues(previous.items, next.items);
  }

  return previous.items !== false && !isJsonSchema(previous.items) && isJsonSchema(next.items);
}

const SCHEMA_NARROWING_CHECKS: Array<(previous: JsonSchema, next: JsonSchema) => boolean> = [
  keywordTypesReject,
  enumRejectsPreviousValues,
  constRejectsPreviousValues,
  formatRejectsPreviousValues,
  boundsRejectPreviousValues,
  patternRejectsPreviousValues,
  requiredRejectsPreviousValues,
  additionalPropertiesReject,
  propertiesRejectPreviousValues,
  itemsRejectPreviousValues,
  combinatorRejectsPreviousValues,
];

function schemaRejectsPreviousValues(previous: JsonSchema, next: JsonSchema): boolean {
  return SCHEMA_NARROWING_CHECKS.some((check) => check(previous, next));
}

/** True when `next` rejects a payload `previous` accepted. Both values must be schema objects. */
export function schemaChangeRejectsPreviousValues(previous: unknown, next: unknown): boolean {
  if (!isJsonSchema(previous) || !isJsonSchema(next)) return false;

  return schemaRejectsPreviousValues(previous, next);
}

function isBreakingPayloadSchemaChange(previous: unknown, next: unknown): boolean {
  if (sameValue(previous, next)) return false;
  if (!isJsonSchema(next)) return false;
  if (!isJsonSchema(previous)) return schemaRejectsSomePayload(next);

  return schemaRejectsPreviousValues(previous, next);
}

/**
 * Breaking replaces Modified when a change can stop triggers that already succeed in production.
 * That is a payload-schema narrowing, or turning payload validation on against a rejecting schema.
 * Added and deleted resources are not breaking: they are not yet in production, or publishing removes them.
 */
function hasBreakingDescendant(resource: IResourceDiffResult): boolean {
  if (resource.resourceType !== 'workflow') return false;
  if (resource.summary.added > 0 || resource.summary.deleted > 0) return false;

  const changes = (Array.isArray(resource.changes) ? resource.changes : []) as INestedResourceChange[];

  return changes.some((change) => {
    if (change.resourceType !== 'workflow') return false;

    const previous = change.diffs?.previous ?? null;
    const next = change.diffs?.new ?? null;
    if (!next) return false;

    const validationOn = next.validatePayload === true;
    if (validationOn && isBreakingPayloadSchemaChange(previous?.payloadSchema, next.payloadSchema)) return true;

    const turnedValidationOn = previous?.validatePayload !== true && validationOn;

    return turnedValidationOn && schemaRejectsSomePayload(next.payloadSchema);
  });
}

/**
 * Tree icon for one row. Every changed row has exactly one status.
 * Collapsed rows surface Breaking when any nested change can stop current triggers.
 * Expanded, the row keeps its own status and the nested row carries Breaking.
 */
export function resolveTreeIconStatus(
  row: Pick<ChangeRow, 'status' | 'hasBreakingDescendant'>,
  expanded = false
): ChangeStatus {
  if (!expanded && row.hasBreakingDescendant && row.status === 'modified') {
    return 'breaking';
  }

  return row.status;
}

// Tree rows count added and deleted steps. The cards count changed lines from the field diffs.
function getWorkflowDiffStat(resource: IResourceDiffResult): ChangeDiffStat | undefined {
  let added = 0;
  let deleted = 0;

  for (const change of (resource.changes ?? []) as INestedResourceChange[]) {
    if (change.resourceType !== 'step') continue;

    if (change.action === 'added') added += 1;
    if (change.action === 'deleted') deleted += 1;
  }

  if (added === 0 && deleted === 0) return undefined;

  return { added, deleted };
}

function toChangeRow(resource: IResourceDiffResult, diffStat?: ChangeDiffStat): ChangeRow | null {
  const id = getResourceId(resource);
  const status = getResourceStatus(resource.summary);

  if (!id || !status) return null;

  const name = getResourceName(resource) || 'Unnamed resource';

  return { id, name, status, hasBreakingDescendant: hasBreakingDescendant(resource), diffStat, resource };
}

/**
 * Builds the Workflows / Layouts / Agents tree used by `ChangesSidebar`.
 * Translation diffs stay on the workflow row and render as its Translations section.
 *
 * `breaking` is not a diff action. A modified workflow is breaking when a nested payload change
 * can stop triggers that already work in production. The tree applies that only while the row
 * is collapsed (see `resolveTreeIconStatus`).
 */
export function buildChangesTree(
  workflows: IResourceDiffResult[],
  layouts: IResourceDiffResult[],
  agents: IResourceDiffResult[] = []
): UseChangesTreeResult {
  const workflowRows = workflows
    .map((resource) => toChangeRow(resource, getWorkflowDiffStat(resource)))
    .filter((row): row is ChangeRow => row !== null);

  const layoutRows = layouts.map((resource) => toChangeRow(resource)).filter((row): row is ChangeRow => row !== null);

  const agentRows = agents.map((resource) => toChangeRow(resource)).filter((row): row is ChangeRow => row !== null);

  return {
    workflows: { type: 'workflow', label: 'Workflows', rows: workflowRows },
    layouts: { type: 'layout', label: 'Layouts', rows: layoutRows },
    agents: { type: 'agent', label: 'Agents', rows: agentRows },
  };
}

export function useChangesTree(
  workflows: IResourceDiffResult[],
  layouts: IResourceDiffResult[],
  agents: IResourceDiffResult[] = []
): UseChangesTreeResult {
  return useMemo(() => buildChangesTree(workflows, layouts, agents), [workflows, layouts, agents]);
}
