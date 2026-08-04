import { useState } from 'react';
import type { CredentialField } from './credential-fields';

function toValues(fields: CredentialField[]): Record<string, string> {
  return fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.key] = field.value;

    return acc;
  }, {});
}

type UseCredentialFormDraftArgs = {
  fields: CredentialField[];
  onSave: (values: Record<string, string>) => Promise<boolean>;
  onCancel: () => void;
};

/**
 * Local draft for credential create/edit. Call {@link resetDraft} when entering
 * edit to snapshot server values. Do not sync from `fields` during edit: parents
 * often pass a new fields array each render, which would flash stale credentials
 * while a save is in flight.
 */
export function useCredentialFormDraft({ fields, onSave, onCancel }: UseCredentialFormDraftArgs) {
  const [draft, setDraft] = useState<Record<string, string>>(() => toValues(fields));
  const [baseline, setBaseline] = useState<Record<string, string>>(() => toValues(fields));
  const [showErrors, setShowErrors] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const hasMissingRequired = fields.some((field) => !field.optional && (draft[field.key] ?? '').trim().length === 0);
  const hasChanges = fields.some((field) => (draft[field.key] ?? '') !== (baseline[field.key] ?? ''));
  const hasUnsavedCredential = !isSaving && hasChanges;

  const setField = (key: string, value: string) => setDraft((prev) => ({ ...prev, [key]: value }));

  const resetDraft = (nextFields: CredentialField[] = fields) => {
    const values = toValues(nextFields);
    setDraft(values);
    setBaseline(values);
    setShowErrors(false);
  };

  const cancel = () => {
    setDraft(baseline);
    setShowErrors(false);
    onCancel();
  };

  const save = async () => {
    if (hasMissingRequired) {
      setShowErrors(true);

      return;
    }

    setIsSaving(true);
    const values = fields.reduce<Record<string, string>>((acc, field) => {
      const value = (draft[field.key] ?? '').trim();

      // Blank optional fields are omitted entirely: endpoint validators treat
      // them as absent (e.g. grafana authToken must be non-empty when present).
      if (value.length === 0 && field.optional) {
        return acc;
      }

      acc[field.key] = value;

      return acc;
    }, {});
    const succeeded = await onSave(values);
    setIsSaving(false);

    if (succeeded) {
      // Exit without resetting to the pre-edit baseline; display uses refreshed props.
      setShowErrors(false);
      onCancel();
    }
  };

  return {
    draft,
    setField,
    showErrors,
    isSaving,
    hasUnsavedCredential,
    save,
    cancel,
    resetDraft,
  };
}
