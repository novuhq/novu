import { useEffect, useMemo, useState } from 'react';
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
  /** Called after a successful save to exit edit/add mode. Defaults to `onCancel`. */
  onSaved?: () => void;
};

export function useCredentialFormDraft({ fields, onSave, onCancel, onSaved }: UseCredentialFormDraftArgs) {
  const initialValues = useMemo(() => toValues(fields), [fields]);
  const [draft, setDraft] = useState<Record<string, string>>(initialValues);
  const [showErrors, setShowErrors] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraft(toValues(fields));
    setShowErrors(false);
  }, [fields]);

  const hasMissingRequired = fields.some((field) => !field.optional && (draft[field.key] ?? '').trim().length === 0);
  const hasChanges = fields.some((field) => (draft[field.key] ?? '') !== (initialValues[field.key] ?? ''));
  const hasUnsavedCredential = !isSaving && hasChanges;

  const setField = (key: string, value: string) => setDraft((prev) => ({ ...prev, [key]: value }));

  const resetDraft = () => {
    setDraft(initialValues);
    setShowErrors(false);
  };

  const cancel = () => {
    resetDraft();
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
      resetDraft();
      (onSaved ?? onCancel)();
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
  };
}
