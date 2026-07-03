import { useId, useState } from 'react';
import { CopyButton } from '@/components/primitives/copy-button';
import { Input } from '@/components/primitives/input';
import { CredentialFieldActions } from './credential-field-actions';
import {
  CREDENTIAL_CARD_CLASS,
  CREDENTIAL_FIELD_BOX_CLASS,
  CREDENTIAL_FIELD_LABEL_CLASS,
  CREDENTIAL_HOVER_ACTIONS_CLASS,
  type CredentialField,
} from './credential-fields';
import { maskCredentialValue } from './mask-credential-value';
import { useCredentialFormDraft } from './use-credential-form-draft';

const iconButtonClassName = 'p-0.5 hover:bg-transparent';

type CredentialFormRowProps = {
  fields: CredentialField[];
  /** Human-readable entity name for a11y labels, e.g. "Slack credential". */
  ariaEntity: string;
  readOnly: boolean;
  /** When false (default), credential values are partially masked in display mode. */
  valuesVisible?: boolean;
  onSave: (values: Record<string, string>) => Promise<boolean>;
  onDelete: () => void;
};

/**
 * A single credential rendered as labeled read-only values that flip to inline inputs.
 * Actions stay in one row and swap from copy · edit · delete to check · close on edit.
 */
export function CredentialFormRow({
  fields,
  ariaEntity,
  readOnly,
  valuesVisible = false,
  onSave,
  onDelete,
}: CredentialFormRowProps) {
  const baseId = useId();
  const [isEditing, setIsEditing] = useState(false);

  const { draft, setField, showErrors, isSaving, hasUnsavedCredential, save, cancel } = useCredentialFormDraft({
    fields,
    onSave,
    onCancel: () => setIsEditing(false),
  });

  const handleCancel = () => cancel();

  return (
    <div className={CREDENTIAL_CARD_CLASS}>
      {hasUnsavedCredential && <span hidden data-dirty="true" />}
      {fields.map((field, index) => {
        const isFirst = index === 0;
        const showItemActions = !readOnly && isFirst;
        const value = isEditing ? (draft[field.key] ?? '') : field.value;
        const hasCopy = !isEditing && field.value.length > 0;
        const showFieldActions = showItemActions || hasCopy;
        const showError = isEditing && showErrors && !field.optional && value.trim().length === 0;
        const fieldId = `${baseId}-${field.key}`;

        let paddingClass = '';

        if (showItemActions) {
          paddingClass = isEditing ? 'pr-14' : 'pr-16';
        } else if (hasCopy) {
          paddingClass = 'pr-7';
        }

        const displayValue =
          !isEditing && !valuesVisible && field.value ? maskCredentialValue(field.value) : field.value;

        return (
          <div key={field.key} className="flex min-w-0 flex-col gap-1">
            {isEditing ? (
              <label htmlFor={fieldId} className={CREDENTIAL_FIELD_LABEL_CLASS}>
                {field.label}
              </label>
            ) : (
              <span className={CREDENTIAL_FIELD_LABEL_CLASS}>{field.label}</span>
            )}
            <div className={isEditing ? 'relative' : `relative ${CREDENTIAL_FIELD_BOX_CLASS}`}>
              {isEditing ? (
                <Input
                  id={fieldId}
                  size="2xs"
                  className={`font-mono ${paddingClass}`}
                  value={value}
                  hasError={showError}
                  autoFocus={isFirst}
                  placeholder={field.optional ? 'Optional' : ''}
                  onChange={(event) => setField(field.key, event.target.value)}
                />
              ) : (
                <span className={`min-w-0 flex-1 truncate ${paddingClass}`}>{displayValue || '—'}</span>
              )}
              {showFieldActions && (
                <>
                  {showItemActions ? (
                    <CredentialFieldActions
                      mode={isEditing ? 'edit' : 'view'}
                      copyValue={hasCopy ? field.value : undefined}
                      copyLabel={field.label}
                      ariaEntity={ariaEntity}
                      isSaving={isSaving}
                      onEdit={isEditing ? undefined : () => setIsEditing(true)}
                      onDelete={isEditing ? undefined : onDelete}
                      onConfirm={isEditing ? save : undefined}
                      onCancel={isEditing ? handleCancel : undefined}
                    />
                  ) : (
                    hasCopy && (
                      <div
                        className={`absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-1 ${CREDENTIAL_HOVER_ACTIONS_CLASS}`}
                      >
                        <CopyButton
                          valueToCopy={field.value}
                          size="2xs"
                          className={iconButtonClassName}
                          ariaLabel={`Copy ${field.label}`}
                        />
                      </div>
                    )
                  )}
                </>
              )}
            </div>
            {showError && <span className="text-error-base text-2xs">{field.label} is required</span>}
          </div>
        );
      })}
    </div>
  );
}
