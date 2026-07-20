import type { ChannelEndpointType } from '@novu/shared';
import { useState } from 'react';
import type { ChannelEndpointPayload } from '@/api/channel-endpoints';
import { AddCredentialDropdown } from './add-credential-dropdown';
import type { ChatCredentialItem, ChatIntegrationRow } from './build-credential-groups';
import type { ChatEndpointTypeOption } from './chat-endpoint-types';
import { payloadToFields } from './credential-fields';
import { CredentialFormEditor } from './credential-form-editor';
import { CredentialFormRow } from './credential-form-row';
import { CredentialItemsCard } from './credential-items-card';

function getInitialAddOption(
  autoStartAdding: boolean,
  addableTypes: ChatEndpointTypeOption[]
): ChatEndpointTypeOption | null {
  if (!autoStartAdding || addableTypes.length !== 1) {
    return null;
  }

  return addableTypes[0] ?? null;
}

type ChatIntegrationCardProps = {
  row: ChatIntegrationRow;
  subscriberId: string;
  readOnly: boolean;
  /** When true and there is exactly one addable type, opens that add form immediately. */
  autoStartAdding?: boolean;
  onAddCancelled?: () => void;
  onSaveItem: (item: ChatCredentialItem, payload: ChannelEndpointPayload) => Promise<boolean>;
  onDeleteItem: (item: ChatCredentialItem) => void;
  onAddItem: (row: ChatIntegrationRow, type: ChannelEndpointType, payload: ChannelEndpointPayload) => Promise<boolean>;
};

export function ChatIntegrationCard({
  row,
  subscriberId,
  readOnly,
  autoStartAdding = false,
  onAddCancelled,
  onSaveItem,
  onDeleteItem,
  onAddItem,
}: ChatIntegrationCardProps) {
  const [addOption, setAddOption] = useState<ChatEndpointTypeOption | null>(() =>
    getInitialAddOption(autoStartAdding, row.addableTypes)
  );

  const canAdd = !readOnly && row.addableTypes.length > 0;

  const addControl = canAdd ? (
    <AddCredentialDropdown
      displayName={row.displayName}
      providerId={row.providerId}
      integrationIdentifier={row.integrationIdentifier}
      connectionIdentifier={row.connectionIdentifier}
      subscriberId={subscriberId}
      options={row.addableTypes}
      onSelect={setAddOption}
    />
  ) : null;

  const addEditor = addOption ? (
    <CredentialFormEditor
      fields={payloadToFields(addOption.skeleton)}
      onSave={(values) => onAddItem(row, addOption.type, values as ChannelEndpointPayload)}
      onCancel={() => {
        setAddOption(null);
        onAddCancelled?.();
      }}
      onSaved={() => setAddOption(null)}
    />
  ) : null;

  return (
    <CredentialItemsCard<ChatCredentialItem>
      providerId={row.providerId}
      displayName={row.displayName}
      items={row.items}
      addControl={addControl}
      addEditor={addEditor}
      renderItem={(item, _index, valuesVisible) => (
        <CredentialFormRow
          key={item.id}
          fields={payloadToFields(item.payload)}
          ariaEntity={`${row.displayName} credential`}
          readOnly={readOnly}
          valuesVisible={valuesVisible}
          onSave={(values) => onSaveItem(item, values as ChannelEndpointPayload)}
          onDelete={() => onDeleteItem(item)}
        />
      )}
    />
  );
}
