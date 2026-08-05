import { useId } from 'react';
import { Input } from '@/components/primitives/input';
import { CredentialFieldActions } from './credential-field-actions';
import { CREDENTIAL_CARD_CLASS, CREDENTIAL_FIELD_LABEL_CLASS, type CredentialField } from './credential-fields';
import { useCredentialFormDraft } from './use-credential-form-draft';

type CredentialFormEditorProps = {
  fields: CredentialField[];
  onSave: (values: Record<string, string>) => Promise<boolean>;
  onCancel: () => void;
  /** Called after a successful save. Defaults to `onCancel` when omitted. */
  onSaved?: () => void;
};

/**
 * Inline form for adding a new credential. Uses the same labeled inputs and
 * check · close actions as the edit flow in {@link CredentialFormRow}.
 */
export function CredentialFormEditor({ fields, onSave, onCancel, onSaved }: CredentialFormEditorProps) {
  const baseId = useId();

  const { draft, setField, showErrors, isSaving, hasUnsavedCredential, save, cancel } = useCredentialFormDraft({
    fields,
    onSave,
    onCancel,
    onSaved,
  });

  return (
    <div className={CREDENTIAL_CARD_CLASS}>
      {hasUnsavedCredential && <span hidden data-dirty="true" />}
      {fields.map((field, index) => {
        const value = draft[field.key] ?? '';
        const showError = showErrors && !field.optional && value.trim().length === 0;
        const fieldId = `${baseId}-${field.key}`;
        const isFirst = index === 0;

        return (
          <div key={field.key} className="flex flex-col gap-1">
            <label htmlFor={fieldId} className={CREDENTIAL_FIELD_LABEL_CLASS}>
              {field.label}
            </label>
            <div className="relative">
              <Input
                id={fieldId}
                size="2xs"
                className={`font-mono ${isFirst ? 'pr-14' : ''}`}
                value={value}
                hasError={showError}
                autoFocus={isFirst}
                placeholder={field.optional ? 'Optional' : ''}
                onChange={(event) => setField(field.key, event.target.value)}
              />
              {isFirst && (
                <CredentialFieldActions
                  mode="edit"
                  ariaEntity=""
                  isSaving={isSaving}
                  onConfirm={save}
                  onCancel={cancel}
                />
              )}
            </div>
            {showError && <span className="text-error-base text-2xs">{field.label} is required</span>}
          </div>
        );
      })}
    </div>
  );
}
