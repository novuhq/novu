import type { WorkflowResponseDto } from '@novu/shared';

const SYNCED_FIELDS = ['name', 'description', 'tags'] as const;

export type SyncedField = (typeof SYNCED_FIELDS)[number];
export type SyncedValues = Pick<WorkflowResponseDto, SyncedField>;

// The form holds an empty field as '' or [], while the workflow leaves it undefined.
export function toFormValue(field: SyncedField, value: SyncedValues[SyncedField] | undefined) {
  return value ?? (field === 'tags' ? [] : '');
}

function isSameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * The fields the form can take over from a workflow update: the workflow value moved, and the form still shows the
 * value it last synced, so the user has not edited the field. A field the user edited stays theirs, while the
 * untouched ones stay current, so a later save does not write their old values over the Copilot's.
 */
export function getFieldsToSync(
  previous: SyncedValues,
  next: SyncedValues,
  formValues: Partial<SyncedValues>
): SyncedField[] {
  return SYNCED_FIELDS.filter((field) => {
    if (isSameValue(toFormValue(field, previous[field]), toFormValue(field, next[field]))) return false;

    return isSameValue(toFormValue(field, formValues[field]), toFormValue(field, previous[field]));
  });
}
