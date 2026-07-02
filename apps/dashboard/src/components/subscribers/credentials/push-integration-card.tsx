import { useState } from 'react';
import { AddButton } from '@/components/primitives/add-button';
import type { EditableCredentialRow } from './build-credential-groups';
import { CredentialItemsCard } from './credential-items-card';
import { CredentialJsonEditor, type ParseResult } from './credential-json-editor';
import { CredentialJsonRow } from './credential-json-row';

const iconButtonClassName = 'p-0.5 hover:bg-transparent';
const EDITOR_HEIGHT = '80px';

/**
 * Device tokens are stored as plain strings, but the editor exposes them as a JSON object
 * (`{ "deviceToken": "..." }`) so the shape can grow additional fields in the future.
 */
function parseDeviceToken(value: string): ParseResult<string> {
  const trimmed = value.trim();

  if (!trimmed) {
    return { ok: false, error: 'Payload is required' };
  }

  try {
    const parsed = JSON.parse(trimmed);

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ok: false, error: 'Payload must be a JSON object' };
    }

    const token = (parsed as { deviceToken?: unknown }).deviceToken;

    if (typeof token !== 'string' || token.trim().length === 0) {
      return { ok: false, error: '"deviceToken" is required' };
    }

    return { ok: true, value: token.trim() };
  } catch {
    return { ok: false, error: 'Invalid JSON' };
  }
}

function toDeviceTokenJson(token: string): string {
  return JSON.stringify({ deviceToken: token }, null, 2);
}

type PushIntegrationCardProps = {
  row: EditableCredentialRow;
  readOnly: boolean;
  onSaveToken: (row: EditableCredentialRow, value: string, mode: 'add' | 'edit', index?: number) => Promise<boolean>;
  onDeleteToken: (row: EditableCredentialRow, index: number) => void;
};

export function PushIntegrationCard({ row, readOnly, onSaveToken, onDeleteToken }: PushIntegrationCardProps) {
  const [isAdding, setIsAdding] = useState(false);

  const addControl = readOnly ? null : (
    <AddButton
      size="2xs"
      className={`${iconButtonClassName} ml-auto`}
      tooltip="Add device token"
      aria-label={`Add ${row.displayName} device token`}
      onClick={() => setIsAdding(true)}
    />
  );

  const addEditor = isAdding ? (
    <CredentialJsonEditor<string>
      initialValue={toDeviceTokenJson('')}
      saveLabel="Add token"
      parse={parseDeviceToken}
      onSave={(value) => onSaveToken(row, value, 'add')}
      onCancel={() => setIsAdding(false)}
      height={EDITOR_HEIGHT}
    />
  ) : null;

  return (
    <CredentialItemsCard<string>
      providerId={row.providerId}
      displayName={row.displayName}
      items={row.values}
      addControl={addControl}
      addEditor={addEditor}
      renderItem={(token, index) => (
        <CredentialJsonRow<string>
          key={`${row.id}:token:${index}`}
          json={toDeviceTokenJson(token)}
          ariaEntity={`${row.displayName} device token`}
          readOnly={readOnly}
          parse={parseDeviceToken}
          onSave={(value) => onSaveToken(row, value, 'edit', index)}
          onDelete={() => onDeleteToken(row, index)}
          editorHeight={EDITOR_HEIGHT}
        />
      )}
    />
  );
}
