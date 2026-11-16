import type { IconType } from 'react-icons';
import {
  RiChatThreadLine,
  RiCodeBlock,
  RiDatabase2Line,
  RiFlashlightLine,
  RiGlobalLine,
  RiHourglassLine,
  RiInboxLine,
  RiInformationLine,
  RiLayout5Line,
  RiMailLine,
  RiMessage2Line,
  RiNotification3Line,
  RiRobot2Line,
  RiRouteFill,
  RiSettingsLine,
  RiShadowLine,
  RiSpeedUpLine,
  RiToolsLine,
  RiTranslate2,
} from 'react-icons/ri';
import {
  type ChangeDiffStat,
  type ChangeGroupType,
  type ChangeRow,
  type ChangeStatus,
  type INestedResourceChange,
  schemaChangeRejectsPreviousValues,
} from '@/hooks/use-changes-tree';
import { StepTypeEnum } from '@/utils/enums';
import { diffJsonLines, diffTextLines, type JsonLineDiff } from './json-line-diff';

export const GROUP_ICONS: Record<ChangeGroupType, IconType> = {
  workflow: RiRouteFill,
  layout: RiLayout5Line,
  agent: RiRobot2Line,
};

export type ChangeSectionKey =
  | 'payloadSchema'
  | 'steps'
  | 'preferences'
  | 'translations'
  | 'agent'
  | 'details'
  | 'content';

export const SECTION_ICONS: Record<ChangeSectionKey, IconType> = {
  payloadSchema: RiDatabase2Line,
  steps: RiRouteFill,
  preferences: RiSettingsLine,
  translations: RiTranslate2,
  agent: RiRobot2Line,
  details: RiInformationLine,
  content: RiCodeBlock,
};

const STEP_TYPE_ICONS: Record<StepTypeEnum, IconType> = {
  [StepTypeEnum.IN_APP]: RiInboxLine,
  [StepTypeEnum.EMAIL]: RiMailLine,
  [StepTypeEnum.SMS]: RiMessage2Line,
  [StepTypeEnum.CHAT]: RiChatThreadLine,
  [StepTypeEnum.PUSH]: RiNotification3Line,
  [StepTypeEnum.TOOL]: RiToolsLine,
  [StepTypeEnum.DIGEST]: RiShadowLine,
  [StepTypeEnum.TRIGGER]: RiFlashlightLine,
  [StepTypeEnum.DELAY]: RiHourglassLine,
  [StepTypeEnum.THROTTLE]: RiSpeedUpLine,
  [StepTypeEnum.CUSTOM]: RiCodeBlock,
  [StepTypeEnum.HTTP_REQUEST]: RiGlobalLine,
};

export function getStepIcon(stepType: string | undefined): IconType {
  return STEP_TYPE_ICONS[stepType as StepTypeEnum] ?? RiRouteFill;
}

const PREVIEWABLE_STEP_TYPES = new Set<string>([
  StepTypeEnum.EMAIL,
  StepTypeEnum.IN_APP,
  StepTypeEnum.SMS,
  StepTypeEnum.PUSH,
  StepTypeEnum.CHAT,
  StepTypeEnum.TOOL,
]);

/** Channel steps render a message preview; action steps (delay, digest, ...) only have JSON to compare. */
export function isStepPreviewable(stepType: string | undefined): boolean {
  return stepType !== undefined && PREVIEWABLE_STEP_TYPES.has(stepType);
}

/** Identifies a resource card (`rowId`) or one of its section rows (`rowId:sectionKey`) as a scroll target. */
export function changeNodeKey(rowId: string, sectionKey?: ChangeSectionKey): string {
  return sectionKey ? `${rowId}:${sectionKey}` : rowId;
}

/** Scroll target for one changed step or payload variable inside a section. */
export function changeItemKey(rowId: string, sectionKey: ChangeSectionKey, itemId: string): string {
  return `${changeNodeKey(rowId, sectionKey)}:${itemId}`;
}

export type ChangeSectionItem = {
  id: string;
  name: string;
  stepType?: string;
  status: ChangeStatus;
  step?: StepChange;
};

/** Both sides of one changed step, as the publish modal compares them. */
export type StepChange = {
  stepId: string;
  action: NonNullable<INestedResourceChange['action']>;
  previous: Record<string, unknown> | null;
  next: Record<string, unknown> | null;
  lineDiff: JsonLineDiff;
  diffStat: ChangeDiffStat;
  previousIndex?: number;
  newIndex?: number;
};

export type SchemaRuleChange = {
  action: 'added' | 'removed';
  label: string;
};

/** One changed payload variable, shown as a tree row and summarized in the payload schema note. */
export type SchemaVariableChange = {
  id: string;
  name: string;
  /** Dotted path, e.g. `user.contact.email`. Equals `name` for top-level variables. */
  path: string;
  presence: 'added' | 'removed' | 'modified';
  severity: 'breaking' | 'warning';
  rules: SchemaRuleChange[];
  /** Previous variable name when this change is a rename. */
  renamedFrom?: string;
};

export type PayloadSchemaPreview = {
  lineDiff: JsonLineDiff;
  /** Plain-language summary of the breaking change(s); absent when nothing breaks. */
  note?: string;
  hasPrevious: boolean;
  /** Set when payload validation is switched on or off, including when the schema itself is unchanged. */
  validation?: { previous: boolean; next: boolean };
};

export type ChangeSection = {
  key: ChangeSectionKey;
  label: string;
  status: ChangeStatus;
  meta?: string;
  items?: ChangeSectionItem[];
  schemaChanges?: SchemaVariableChange[];
  schemaPreview?: PayloadSchemaPreview;
  /** Production vs. development JSON for sections that have no richer view. */
  fieldsDiff?: FieldsDiff;
  /** Layout email controls for the side-by-side preview. */
  layoutPreview?: LayoutContentPreview;
  diffStat: ChangeDiffStat;
};

export type FieldsDiff = {
  lineDiff: JsonLineDiff;
  hasPrevious: boolean;
  hasNext: boolean;
};

/** Control values for each side of a layout, rendered the same way a step preview is. */
export type LayoutContentPreview = {
  previous: Record<string, unknown> | null;
  next: Record<string, unknown> | null;
};

export type ChangeCardModel = {
  sections: ChangeSection[];
  diffStat: ChangeDiffStat;
};

const PAYLOAD_FIELDS = ['payloadSchema', 'validatePayload'];
// Severity is edited on the channel preferences page, next to the channel toggles.
const PREFERENCE_FIELDS = ['preferences', 'severity'];
const TRANSLATION_FIELDS = ['isTranslationEnabled'];
const AGENT_FIELD = 'agent';
const VALIDATION_CHANGE_ID = 'validate-payload';
const ROOT_SCHEMA_CHANGE_ID = 'schema';
const SECTIONED_WORKFLOW_FIELDS = new Set([
  ...PAYLOAD_FIELDS,
  ...PREFERENCE_FIELDS,
  ...TRANSLATION_FIELDS,
  AGENT_FIELD,
]);

const EMPTY_DIFF_STAT: ChangeDiffStat = { added: 0, deleted: 0 };

type WorkflowFields = Record<string, unknown> | null | undefined;

function isContainer(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAbsent(value: unknown): boolean {
  return value === undefined || value === null;
}

function sumStats(stats: ChangeDiffStat[]): ChangeDiffStat {
  return stats.reduce(
    (total, stat) => ({ added: total.added + stat.added, deleted: total.deleted + stat.deleted }),
    EMPTY_DIFF_STAT
  );
}

function hasChanges(stat: ChangeDiffStat): boolean {
  return stat.added > 0 || stat.deleted > 0;
}

function countLeaves(value: unknown): number {
  if (isAbsent(value)) return 0;
  if (!isContainer(value)) return 1;

  const children = Object.values(value);
  if (children.length === 0) return 1;

  return children.reduce<number>((total, child) => total + countLeaves(child), 0);
}

/**
 * Line-diff style stat over JSON values: an edited leaf reads "+1 -1", an added subtree "+N"
 * and a removed one "-N". The diff API has no line-level counts, so leaves stand in for lines.
 */
export function countLeafDiff(previous: unknown, next: unknown): ChangeDiffStat {
  if (isAbsent(previous) && isAbsent(next)) return EMPTY_DIFF_STAT;
  if (isAbsent(previous)) return { added: countLeaves(next), deleted: 0 };
  if (isAbsent(next)) return { added: 0, deleted: countLeaves(previous) };

  if (isContainer(previous) && isContainer(next)) {
    const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);

    return sumStats([...keys].map((key) => countLeafDiff(previous[key], next[key])));
  }

  if (previous === next) return EMPTY_DIFF_STAT;

  return { added: countLeaves(next), deleted: countLeaves(previous) };
}

function pickFields(source: WorkflowFields, fields: string[]): WorkflowFields {
  if (!source) return null;

  return Object.fromEntries(fields.map((field) => [field, source[field]]));
}

function omitFields(source: WorkflowFields, fields: Set<string>): WorkflowFields {
  if (!source) return null;

  return Object.fromEntries(Object.entries(source).filter(([field]) => !fields.has(field)));
}

function changeDiffStat(change: INestedResourceChange): ChangeDiffStat {
  if (change.action === 'moved') return { added: 1, deleted: 1 };

  return countLeafDiff(change.diffs?.previous, change.diffs?.new);
}

function changeStatus(change: INestedResourceChange): ChangeStatus {
  if (change.action === 'added') return 'added';
  if (change.action === 'deleted') return 'deleted';

  return 'modified';
}

function combinedStatus(changes: INestedResourceChange[]): ChangeStatus {
  const statuses = new Set(changes.map(changeStatus));

  return statuses.size === 1 ? [...statuses][0] : 'modified';
}

function toStepChange(change: INestedResourceChange, stepId: string): StepChange {
  const previous = change.diffs?.previous ?? null;
  const next = change.diffs?.new ?? null;
  const lineDiff = diffJsonLines(previous, next);
  const diffStat =
    change.action === 'moved' ? changeDiffStat(change) : { added: lineDiff.added, deleted: lineDiff.removed };

  return {
    stepId,
    action: change.action ?? 'modified',
    previous,
    next,
    lineDiff,
    diffStat,
    previousIndex: change.previousIndex,
    newIndex: change.newIndex,
  };
}

function toStepItem(change: INestedResourceChange, index: number): ChangeSectionItem {
  const id = change.sourceResource?.id || change.targetResource?.id || `step-${index}`;

  return {
    id,
    name: change.sourceResource?.name || change.targetResource?.name || 'Unnamed step',
    stepType: change.stepType,
    status: changeStatus(change),
    step: toStepChange(change, id),
  };
}

function buildStepsSection(changes: INestedResourceChange[]): ChangeSection | null {
  if (changes.length === 0) return null;

  const items = changes.map(toStepItem);

  return {
    key: 'steps',
    label: 'Steps',
    meta: `${changes.length} changed`,
    status: combinedStatus(changes),
    items,
    diffStat: sumStats(items.map((item) => item.step?.diffStat ?? EMPTY_DIFF_STAT)),
  };
}

function getNestedChanges(row: ChangeRow): INestedResourceChange[] {
  return (Array.isArray(row.resource.changes) ? row.resource.changes : []) as INestedResourceChange[];
}

function toFieldsDiff(previous: WorkflowFields, next: WorkflowFields): FieldsDiff {
  return { lineDiff: diffJsonLines(previous, next), hasPrevious: !isAbsent(previous), hasNext: !isAbsent(next) };
}

function fieldsDiffStat({ lineDiff }: FieldsDiff): ChangeDiffStat {
  return { added: lineDiff.added, deleted: lineDiff.removed };
}

function fieldsDiffStatus({ hasPrevious, hasNext }: FieldsDiff): ChangeStatus {
  if (!hasPrevious) return 'added';
  if (!hasNext) return 'deleted';

  return 'modified';
}

function payloadSectionStatus(hasPrevious: boolean, hasNext: boolean, breaking: boolean): ChangeStatus {
  if (breaking) return 'breaking';
  // A validation-only edit has no schema on either side. That is a change, not a new schema.
  if (!hasPrevious && hasNext) return 'added';
  if (hasPrevious && !hasNext) return 'deleted';

  return 'modified';
}

function buildWorkflowFieldSection(
  workflowChange: INestedResourceChange | undefined,
  section: Pick<ChangeSection, 'key' | 'label'>,
  select: (source: WorkflowFields) => WorkflowFields
): ChangeSection | null {
  if (!workflowChange?.diffs) return null;

  const fieldsDiff = toFieldsDiff(select(workflowChange.diffs.previous), select(workflowChange.diffs.new));
  const diffStat = fieldsDiffStat(fieldsDiff);
  if (!hasChanges(diffStat)) return null;

  return { ...section, status: fieldsDiffStatus(fieldsDiff), fieldsDiff, diffStat };
}

function workflowAgent(value: WorkflowFields): Record<string, unknown> | null {
  if (!isContainer(value) || !isContainer(value.agent)) return null;

  return value.agent;
}

function agentIdentifier(agent: Record<string, unknown> | null): string | null {
  if (!agent || typeof agent.identifier !== 'string' || agent.identifier.length === 0) return null;

  return agent.identifier;
}

/** The agent field is its own row, so assigning one reads as an assignment instead of a workflow-details edit. */
function buildAgentAssignmentSection(workflowChange: INestedResourceChange | undefined): ChangeSection | null {
  if (!workflowChange?.diffs) return null;

  const previous = workflowAgent(workflowChange.diffs.previous);
  const next = workflowAgent(workflowChange.diffs.new);
  const fieldsDiff = toFieldsDiff(previous, next);
  const diffStat = fieldsDiffStat(fieldsDiff);
  if (!hasChanges(diffStat)) return null;

  const previousId = agentIdentifier(previous);
  const nextId = agentIdentifier(next);
  const { label, meta } = agentAssignmentCopy(previousId, nextId);

  return { key: 'agent', label, meta, status: fieldsDiffStatus(fieldsDiff), fieldsDiff, diffStat };
}

function agentAssignmentCopy(previousId: string | null, nextId: string | null): { label: string; meta?: string } {
  if (!previousId && nextId) {
    return { label: 'Assigned an agent', meta: nextId };
  }

  if (previousId && !nextId) {
    return { label: 'Unassigned the agent', meta: previousId };
  }

  if (previousId && nextId && previousId !== nextId) {
    return { label: 'Reassigned the agent', meta: `${previousId} → ${nextId}` };
  }

  return { label: 'Updated the agent', meta: nextId ?? undefined };
}

/** One side of the Translations section: the workflow's translation toggle plus its translation group(s). */
function translationSide(workflowFields: WorkflowFields, groups: Array<WorkflowFields>): WorkflowFields {
  const presentGroups = groups.filter((group): group is Record<string, unknown> => isContainer(group));
  const enabled = workflowFields?.isTranslationEnabled;
  if (presentGroups.length === 0 && enabled === undefined) return null;

  const side: Record<string, unknown> = enabled === undefined ? {} : { isTranslationEnabled: enabled };
  if (presentGroups.length === 1) return { ...side, ...presentGroups[0] };
  if (presentGroups.length > 1) return { ...side, groups: presentGroups };

  return side;
}

function buildTranslationsSection(
  workflowChange: INestedResourceChange | undefined,
  translationChanges: INestedResourceChange[]
): ChangeSection | null {
  const previousEnabled = workflowChange?.diffs?.previous?.isTranslationEnabled === true;
  const nextEnabled = workflowChange?.diffs?.new?.isTranslationEnabled === true;
  // A new workflow stores the toggle as false. That is not a translation change on its own.
  if (translationChanges.length === 0 && previousEnabled === nextEnabled) return null;

  const fieldsDiff = toFieldsDiff(
    translationSide(
      workflowChange?.diffs?.previous,
      translationChanges.map((change) => change.diffs?.previous)
    ),
    translationSide(
      workflowChange?.diffs?.new,
      translationChanges.map((change) => change.diffs?.new)
    )
  );
  const diffStat = fieldsDiffStat(fieldsDiff);
  if (!hasChanges(diffStat)) return null;

  return {
    key: 'translations',
    label: 'Translations',
    status: fieldsDiffStatus(fieldsDiff),
    fieldsDiff,
    diffStat,
  };
}

const SCHEMA_KEYWORDS = [
  'type',
  'format',
  'enum',
  'const',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'minLength',
  'maxLength',
  'pattern',
  'minItems',
  'maxItems',
  'minProperties',
  'additionalProperties',
] as const;

type JsonSchema = Record<string, unknown>;

function isSchema(value: unknown): value is JsonSchema {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function schemaProperties(schema: JsonSchema | null): Record<string, unknown> {
  const properties = schema?.properties;

  return isSchema(properties) ? properties : {};
}

function requiredKeys(schema: JsonSchema | null): Set<string> {
  return new Set((Array.isArray(schema?.required) ? schema.required : []).filter((key) => typeof key === 'string'));
}

function formatKeywordValue(value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => String(item)).join(', ');
  if (typeof value === 'object') return '';

  return String(value);
}

function keywordLabel(keyword: string, value: unknown): string {
  const formatted = formatKeywordValue(value);

  return formatted ? `${keyword}: ${formatted}` : keyword;
}

/** Keyword-level +/- rules for one schema node. Breaking is decided separately, with the tree. */
function diffSchemaKeywords(previous: JsonSchema | null, next: JsonSchema | null): SchemaRuleChange[] {
  const rules: SchemaRuleChange[] = [];

  for (const keyword of SCHEMA_KEYWORDS) {
    const previousValue = previous?.[keyword];
    const nextValue = next?.[keyword];
    if (JSON.stringify(previousValue) === JSON.stringify(nextValue)) continue;

    if (previousValue !== undefined) rules.push({ action: 'removed', label: keywordLabel(keyword, previousValue) });
    if (nextValue !== undefined) rules.push({ action: 'added', label: keywordLabel(keyword, nextValue) });
  }

  return rules;
}

function diffRequiredFlag(wasRequired: boolean, isRequired: boolean): SchemaRuleChange | null {
  if (wasRequired === isRequired) return null;

  return { action: isRequired ? 'added' : 'removed', label: 'required' };
}

function variableStatus(change: Pick<SchemaVariableChange, 'presence' | 'severity'>): ChangeStatus {
  if (change.presence === 'removed') return 'deleted';
  if (change.presence === 'added' && change.severity === 'warning') return 'added';
  if (change.severity === 'breaking') return 'breaking';

  return 'modified';
}

function hasNestedSchema(schema: JsonSchema | null): boolean {
  return Object.keys(schemaProperties(schema)).length > 0 || isSchema(schema?.items);
}

function joinSchemaPath(parts: string[]): string {
  return parts.reduce((path, part) => {
    if (!path) return part;
    if (part === '[]') return `${path}[]`;

    return `${path}.${part}`;
  }, '');
}

function nestedVariableChanges(
  previousProperty: JsonSchema | null,
  nextProperty: JsonSchema | null,
  propertyPath: string[],
  validationOn: boolean
): SchemaVariableChange[] {
  if (!hasNestedSchema(previousProperty) && !hasNestedSchema(nextProperty)) return [];

  const itemSchema = isSchema(previousProperty?.items) || isSchema(nextProperty?.items);
  const nestedPrevious = itemSchema && isSchema(previousProperty?.items) ? previousProperty.items : previousProperty;
  const nestedNext = itemSchema && isSchema(nextProperty?.items) ? nextProperty.items : nextProperty;

  return collectVariableChanges(
    isSchema(nestedPrevious) ? nestedPrevious : null,
    isSchema(nestedNext) ? nestedNext : null,
    itemSchema ? [...propertyPath, '[]'] : propertyPath,
    validationOn
  );
}

function variablePresence(
  previousProperty: JsonSchema | null,
  nextProperty: JsonSchema | null
): SchemaVariableChange['presence'] {
  if (!previousProperty) return 'added';
  if (!nextProperty) return 'removed';

  return 'modified';
}

function addedPropertyIsBreaking(owner: JsonSchema | null, nextProperty: JsonSchema | null): boolean {
  if (!owner || owner.additionalProperties === false || !nextProperty) return false;
  if (isSchema(owner.additionalProperties)) {
    return schemaChangeRejectsPreviousValues(owner.additionalProperties, nextProperty);
  }

  return schemaChangeRejectsPreviousValues({}, nextProperty);
}

function toVariableChange(
  key: string,
  propertyPath: string[],
  previousProperty: JsonSchema | null,
  nextProperty: JsonSchema | null,
  requiredRule: SchemaRuleChange | null,
  validationOn: boolean,
  owner: JsonSchema | null
): SchemaVariableChange | null {
  const rules = diffSchemaKeywords(previousProperty, nextProperty);
  if (requiredRule) rules.push(requiredRule);
  if (rules.length === 0) return null;

  const presence = variablePresence(previousProperty, nextProperty);
  const requiredAdded = requiredRule?.action === 'added';
  const narrowed =
    previousProperty !== null && nextProperty !== null
      ? schemaChangeRejectsPreviousValues(previousProperty, nextProperty)
      : false;
  const addedConstraint = presence === 'added' && (requiredAdded || addedPropertyIsBreaking(owner, nextProperty));
  // Schema rules only stop triggers while validation is on.
  const rejectsPreviousValues = validationOn && (presence === 'modified' ? narrowed || requiredAdded : addedConstraint);
  const variablePath = joinSchemaPath(propertyPath);

  return {
    id: variablePath,
    name: key,
    path: variablePath,
    presence,
    severity: rejectsPreviousValues ? 'breaking' : 'warning',
    rules,
  };
}

/**
 * Pairs each removed variable with an added one that has the same definition, so a rename reads as
 * one change instead of a deletion plus an addition. Returns a map of new key to previous key.
 */
function findRenamedKeys(previousProperties: Record<string, unknown>, nextProperties: Record<string, unknown>) {
  const removed = Object.keys(previousProperties).filter((key) => !(key in nextProperties));
  const added = Object.keys(nextProperties).filter((key) => !(key in previousProperties));
  const renames = new Map<string, string>();

  for (const previousKey of removed) {
    const serialized = JSON.stringify(previousProperties[previousKey]);
    const match = added.find(
      (nextKey) => !renames.has(nextKey) && JSON.stringify(nextProperties[nextKey]) === serialized
    );
    if (match !== undefined) renames.set(match, previousKey);
  }

  return renames;
}

function renamedVariableChange(
  previousKey: string,
  key: string,
  propertyPath: string[],
  requiredNow: boolean,
  validationOn: boolean
): SchemaVariableChange {
  const variablePath = joinSchemaPath(propertyPath);

  return {
    id: variablePath,
    name: key,
    path: variablePath,
    presence: 'modified',
    // Clients still sending the old name stop matching, but only a newly required name rejects payloads.
    severity: validationOn && requiredNow ? 'breaking' : 'warning',
    rules: [],
    renamedFrom: previousKey,
  };
}

function collectVariableChanges(
  previous: JsonSchema | null,
  next: JsonSchema | null,
  path: string[],
  validationOn: boolean
): SchemaVariableChange[] {
  const previousProperties = schemaProperties(previous);
  const nextProperties = schemaProperties(next);
  const previousRequired = requiredKeys(previous);
  const nextRequired = requiredKeys(next);
  const renames = findRenamedKeys(previousProperties, nextProperties);
  const renamedFrom = new Set(renames.values());
  const keys = [...new Set([...Object.keys(previousProperties), ...Object.keys(nextProperties)])];
  const changes: SchemaVariableChange[] = [];

  for (const key of keys) {
    if (renamedFrom.has(key)) continue;

    const previousKey = renames.get(key);
    if (previousKey !== undefined) {
      changes.push(renamedVariableChange(previousKey, key, [...path, key], nextRequired.has(key), validationOn));
      continue;
    }

    const previousProperty = isSchema(previousProperties[key]) ? previousProperties[key] : null;
    const nextProperty = isSchema(nextProperties[key]) ? nextProperties[key] : null;
    const propertyPath = [...path, key];

    changes.push(...nestedVariableChanges(previousProperty, nextProperty, propertyPath, validationOn));

    const change = toVariableChange(
      key,
      propertyPath,
      previousProperty,
      nextProperty,
      diffRequiredFlag(previousRequired.has(key), nextRequired.has(key)),
      validationOn,
      previous
    );
    if (change) changes.push(change);
  }

  return changes;
}

function rootSchemaChange(
  previousSchema: JsonSchema | null,
  nextSchema: JsonSchema | null,
  validationOn: boolean
): SchemaVariableChange | null {
  const rules = diffSchemaKeywords(previousSchema, nextSchema);
  if (rules.length === 0) return null;

  const breaking =
    validationOn &&
    previousSchema !== null &&
    nextSchema !== null &&
    schemaChangeRejectsPreviousValues(previousSchema, nextSchema);

  return {
    id: ROOT_SCHEMA_CHANGE_ID,
    name: 'Schema',
    path: 'schema',
    presence: schemaPresence(previousSchema, nextSchema),
    severity: breaking ? 'breaking' : 'warning',
    rules,
  };
}

function schemaPresence(
  previousSchema: JsonSchema | null,
  nextSchema: JsonSchema | null
): SchemaVariableChange['presence'] {
  if (!previousSchema) return 'added';
  if (!nextSchema) return 'removed';

  return 'modified';
}

function validationChange(
  previous: JsonSchema | null,
  next: JsonSchema | null,
  existsInProduction: boolean
): SchemaVariableChange | null {
  const turnedOn = previous?.validatePayload !== true && next?.validatePayload === true;
  const turnedOff = previous?.validatePayload === true && next?.validatePayload !== true;
  if (!turnedOn && !turnedOff) return null;

  return {
    id: VALIDATION_CHANGE_ID,
    name: 'Validation',
    path: 'validatePayload',
    presence: previous ? 'modified' : 'added',
    severity: turnedOn && existsInProduction ? 'breaking' : 'warning',
    rules: [
      { action: 'removed', label: previous?.validatePayload === true ? 'on' : 'off' },
      { action: 'added', label: next?.validatePayload === true ? 'on' : 'off' },
    ],
  };
}

const FAILS_AFTER_PUBLISH = 'will fail after you publish.';

function describeBreakingChange(change: SchemaVariableChange): string {
  if (change.id === VALIDATION_CHANGE_ID) {
    return `Turns on payload validation. Triggers with payloads that don't match the schema ${FAILS_AFTER_PUBLISH}`;
  }

  if (change.renamedFrom !== undefined) {
    return `Renames ${change.renamedFrom} to ${change.path}, which is now required. Triggers that don't send ${change.path} ${FAILS_AFTER_PUBLISH}`;
  }

  if (change.rules.some((rule) => rule.action === 'added' && rule.label === 'required')) {
    const verb = change.presence === 'added' ? `Adds ${change.path} as required` : `Makes ${change.path} required`;

    return `${verb}. Triggers that don't send it ${FAILS_AFTER_PUBLISH}`;
  }

  const addedRules = change.rules.filter((rule) => rule.action === 'added').map((rule) => rule.label);
  const subject = change.id === ROOT_SCHEMA_CHANGE_ID ? 'the payload schema' : change.path;

  return `Tightens ${subject} (${addedRules.join(', ')}). Triggers that send values outside the new rules ${FAILS_AFTER_PUBLISH}`;
}

function payloadChangeNote(changes: SchemaVariableChange[]): string | undefined {
  const [first, ...rest] = changes.filter((change) => change.severity === 'breaking');
  if (!first) return undefined;

  const sentence = describeBreakingChange(first);
  if (rest.length === 0) return sentence;

  return `${sentence} Plus ${rest.length} more breaking ${rest.length === 1 ? 'change' : 'changes'}.`;
}

/**
 * `existsInProduction` is false for a workflow that is only in Development. Nothing there is live yet,
 * so no payload change can stop a trigger that works today.
 */
function buildPayloadSchemaSection(
  workflowChange: INestedResourceChange | undefined,
  hasBreakingDescendant: boolean,
  existsInProduction: boolean
): ChangeSection | null {
  if (!workflowChange?.diffs) return null;

  const previous = isSchema(workflowChange.diffs.previous) ? workflowChange.diffs.previous : null;
  const next = isSchema(workflowChange.diffs.new) ? workflowChange.diffs.new : null;
  const previousSchema = isSchema(previous?.payloadSchema) ? previous.payloadSchema : null;
  const nextSchema = isSchema(next?.payloadSchema) ? next.payloadSchema : null;
  const lineDiff = diffJsonLines(previousSchema, nextSchema);
  const validationStat = countLeafDiff(previous?.validatePayload, next?.validatePayload);
  const diffStat = sumStats([{ added: lineDiff.added, deleted: lineDiff.removed }, validationStat]);
  if (!hasChanges(diffStat)) return null;

  const validationOn = existsInProduction && next?.validatePayload === true;
  const schemaChanges = collectVariableChanges(previousSchema, nextSchema, [], validationOn);

  // Root rules stay visible alongside variable changes. They are not properties.
  const rootChange = rootSchemaChange(previousSchema, nextSchema, validationOn);
  if (rootChange) schemaChanges.push(rootChange);

  const validation = validationChange(previous, next, existsInProduction);
  if (validation) schemaChanges.unshift(validation);

  const previousValidation = previous?.validatePayload === true;
  const nextValidation = next?.validatePayload === true;

  return {
    key: 'payloadSchema',
    label: 'Payload schema',
    status: payloadSectionStatus(Boolean(previousSchema), Boolean(nextSchema), hasBreakingDescendant),
    schemaChanges,
    schemaPreview: {
      lineDiff,
      note: payloadChangeNote(schemaChanges),
      hasPrevious: Boolean(previousSchema),
      validation:
        previousValidation === nextValidation ? undefined : { previous: previousValidation, next: nextValidation },
    },
    items: schemaChanges.map((change) => ({ id: change.id, name: change.name, status: variableStatus(change) })),
    diffStat,
  };
}

function buildWorkflowSections(row: ChangeRow): ChangeSection[] {
  const changes = getNestedChanges(row);
  const workflowChange = changes.find((change) => change.resourceType === 'workflow' && change.diffs);
  const stepChanges = changes.filter((change) => change.resourceType === 'step');
  const translationChanges = changes.filter((change) => change.resourceType === 'localization_group');

  const sections = [
    // Breaking is only ever derived from payload schema / validation changes, so it lives on this section.
    buildPayloadSchemaSection(workflowChange, row.hasBreakingDescendant, row.status !== 'added'),
    buildStepsSection(stepChanges),
    buildWorkflowFieldSection(workflowChange, { key: 'preferences', label: 'Channel preferences' }, (source) =>
      pickFields(source, PREFERENCE_FIELDS)
    ),
    buildTranslationsSection(workflowChange, translationChanges),
    buildAgentAssignmentSection(workflowChange),
    buildWorkflowFieldSection(workflowChange, { key: 'details', label: 'Workflow details' }, (source) =>
      omitFields(source, SECTIONED_WORKFLOW_FIELDS)
    ),
  ];

  return sections.filter((section): section is ChangeSection => section !== null);
}

function buildAgentSection(row: ChangeRow): ChangeSection | null {
  const agentChange = getNestedChanges(row).find((change) => change.diffs);
  if (!agentChange?.diffs) return null;

  const fieldsDiff = toFieldsDiff(agentChange.diffs.previous, agentChange.diffs.new);
  const diffStat = fieldsDiffStat(fieldsDiff);
  if (!hasChanges(diffStat)) return null;

  return { key: 'details', label: 'Details', status: fieldsDiffStatus(fieldsDiff), fieldsDiff, diffStat };
}

function layoutControlValues(value: WorkflowFields): Record<string, unknown> | null {
  if (!isContainer(value) || !isContainer(value.controls)) return null;

  const values = value.controls.values;
  if (!isContainer(values)) return null;

  return values;
}

function emailControl(value: WorkflowFields): Record<string, unknown> | null {
  const values = layoutControlValues(value);
  if (!values || !isContainer(values.email)) return null;

  return values.email;
}

function emailBody(value: WorkflowFields): string | null {
  const email = emailControl(value);
  if (!email || typeof email.body !== 'string') return null;

  return email.body;
}

function layoutDetails(value: WorkflowFields): WorkflowFields {
  if (!isContainer(value) || !isContainer(value.controls)) return value;

  const email = emailControl(value);
  if (!email) return value;

  const controls = value.controls;
  const values = isContainer(controls.values) ? controls.values : {};

  return {
    ...value,
    controls: {
      ...controls,
      values: {
        ...values,
        email: { editorType: email.editorType },
      },
    },
  };
}

function textFieldsDiff(previous: string | null, next: string | null): FieldsDiff {
  return {
    lineDiff: diffTextLines(previous, next),
    hasPrevious: previous !== null,
    hasNext: next !== null,
  };
}

function buildLayoutSections(row: ChangeRow): ChangeSection[] {
  const layoutChange = getNestedChanges(row).find((change) => change.diffs);
  if (!layoutChange?.diffs) return [];

  const previous = layoutChange.diffs.previous ?? null;
  const next = layoutChange.diffs.new ?? null;
  const sections: ChangeSection[] = [];
  const contentDiff = textFieldsDiff(emailBody(previous), emailBody(next));
  const contentStat = fieldsDiffStat(contentDiff);
  if (hasChanges(contentStat)) {
    sections.push({
      key: 'content',
      label: 'Content',
      status: fieldsDiffStatus(contentDiff),
      fieldsDiff: contentDiff,
      layoutPreview: {
        previous: layoutControlValues(previous),
        next: layoutControlValues(next),
      },
      diffStat: contentStat,
    });
  }

  const detailsDiff = toFieldsDiff(layoutDetails(previous), layoutDetails(next));
  const detailsStat = fieldsDiffStat(detailsDiff);
  if (hasChanges(detailsStat)) {
    sections.push({
      key: 'details',
      label: 'Details',
      status: fieldsDiffStatus(detailsDiff),
      fieldsDiff: detailsDiff,
      diffStat: detailsStat,
    });
  }

  return sections;
}

export function buildChangeCardModel(row: ChangeRow): ChangeCardModel {
  if (row.resource.resourceType === 'workflow') {
    const sections = buildWorkflowSections(row);

    return { sections, diffStat: sumStats(sections.map((section) => section.diffStat)) };
  }

  if (row.resource.resourceType === 'agent') {
    const section = buildAgentSection(row);
    const sections = section ? [section] : [];

    return { sections, diffStat: sumStats(sections.map((item) => item.diffStat)) };
  }

  if (row.resource.resourceType === 'layout') {
    const sections = buildLayoutSections(row);
    if (sections.length > 0) {
      return { sections, diffStat: sumStats(sections.map((section) => section.diffStat)) };
    }
  }

  return { sections: [], diffStat: sumStats(getNestedChanges(row).map(changeDiffStat)) };
}

/** Added and deleted lines across every card, plus payload changes that can break existing triggers. */
export function summarizeChangeRows(rows: ChangeRow[]): { total: number; breaking: number } {
  let total = 0;
  let breaking = 0;

  for (const row of rows) {
    const model = buildChangeCardModel(row);
    total += model.diffStat.added + model.diffStat.deleted;

    for (const section of model.sections) {
      for (const change of section.schemaChanges ?? []) {
        if (change.severity === 'breaking') breaking += 1;
      }
    }
  }

  return { total, breaking };
}
