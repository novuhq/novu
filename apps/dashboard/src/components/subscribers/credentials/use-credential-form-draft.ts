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
};

export function useCredentialFormDraft({ fields, onSave, onCancel }: UseCredentialFormDraftArgs) {
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

  const cancel = () => {
    setDraft(initialValues);
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
      acc[field.key] = (draft[field.key] ?? '').trim();

      return acc;
    }, {});
    const succeeded = await onSave(values);
    setIsSaving(false);

    if (succeeded) {
      cancel();
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
