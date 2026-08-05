import { useState } from 'react';
import { AddButton } from '@/components/primitives/add-button';
import type { EditableCredentialRow } from './build-credential-groups';
import { type CredentialField, getFieldLabel } from './credential-fields';
import { CredentialFormEditor } from './credential-form-editor';
import { CredentialFormRow } from './credential-form-row';
import { CredentialItemsCard } from './credential-items-card';

const iconButtonClassName = 'p-0.5 hover:bg-transparent';

function deviceTokenField(token: string): CredentialField[] {
  return [{ key: 'deviceToken', label: getFieldLabel('deviceToken'), value: token }];
}

type PushIntegrationCardProps = {
  row: EditableCredentialRow;
  readOnly: boolean;
  /** When true, opens the add form immediately (used after picking from the section Add picker). */
  autoStartAdding?: boolean;
  onAddCancelled?: () => void;
  onSaveToken: (row: EditableCredentialRow, value: string, mode: 'add' | 'edit', index?: number) => Promise<boolean>;
  onDeleteToken: (row: EditableCredentialRow, index: number) => void;
};

export function PushIntegrationCard({
  row,
  readOnly,
  autoStartAdding = false,
  onAddCancelled,
  onSaveToken,
  onDeleteToken,
}: PushIntegrationCardProps) {
  const [isAdding, setIsAdding] = useState(autoStartAdding);

  const addControl = readOnly ? null : (
    <AddButton
      size="2xs"
      className={iconButtonClassName}
      tooltip="Add device token"
      aria-label={`Add ${row.displayName} device token`}
      onClick={() => setIsAdding(true)}
    />
  );

  const addEditor = isAdding ? (
    <CredentialFormEditor
      fields={deviceTokenField('')}
      onSave={(values) => onSaveToken(row, values.deviceToken, 'add')}
      onCancel={() => {
        setIsAdding(false);
        onAddCancelled?.();
      }}
      onSaved={() => setIsAdding(false)}
    />
  ) : null;

  return (
    <CredentialItemsCard<string>
      providerId={row.providerId}
      displayName={row.displayName}
      items={row.values}
      addControl={addControl}
      addEditor={addEditor}
      renderItem={(token, index, valuesVisible) => (
        <CredentialFormRow
          key={`${row.id}:token:${index}`}
          fields={deviceTokenField(token)}
          ariaEntity={`${row.displayName} device token`}
          readOnly={readOnly}
          valuesVisible={valuesVisible}
          onSave={(values) => onSaveToken(row, values.deviceToken, 'edit', index)}
          onDelete={() => onDeleteToken(row, index)}
        />
      )}
    />
  );
}
