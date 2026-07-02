import type { ChannelEndpointType } from '@novu/shared';
import { useState } from 'react';
import { RiAddLine } from 'react-icons/ri';
import type { ChannelEndpointPayload } from '@/api/channel-endpoints';
import { AddButton } from '@/components/primitives/add-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { cn } from '@/utils/ui';
import type { ChatCredentialItem, ChatIntegrationRow } from './build-credential-groups';
import type { ChatEndpointTypeOption } from './chat-endpoint-types';
import { CredentialItemsCard } from './credential-items-card';
import { CredentialJsonEditor, type ParseResult } from './credential-json-editor';
import { CredentialJsonRow } from './credential-json-row';

const iconButtonClassName = 'p-0.5 hover:bg-transparent';

/**
 * Parses the JSON editor text into an endpoint payload. When `option` is provided (add flow),
 * every key present in the type's skeleton must exist as a string so obviously-wrong shapes
 * (e.g. `{}` or `{ foo: "bar" }`) are rejected before hitting the API.
 */
function parseEndpointPayload(value: string, option?: ChatEndpointTypeOption): ParseResult<ChannelEndpointPayload> {
  const trimmed = value.trim();

  if (!trimmed) {
    return { ok: false, error: 'Payload is required' };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: 'Invalid JSON' };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: 'Payload must be a JSON object' };
  }

  const record = parsed as Record<string, unknown>;

  for (const key of Object.keys(option?.skeleton ?? {})) {
    if (typeof record[key] !== 'string') {
      return { ok: false, error: `"${key}" is required` };
    }
  }

  return { ok: true, value: parsed as ChannelEndpointPayload };
}

type ChatIntegrationCardProps = {
  row: ChatIntegrationRow;
  readOnly: boolean;
  onSaveItem: (item: ChatCredentialItem, payload: ChannelEndpointPayload) => Promise<boolean>;
  onDeleteItem: (item: ChatCredentialItem) => void;
  onAddItem: (row: ChatIntegrationRow, type: ChannelEndpointType, payload: ChannelEndpointPayload) => Promise<boolean>;
};

export function ChatIntegrationCard({ row, readOnly, onSaveItem, onDeleteItem, onAddItem }: ChatIntegrationCardProps) {
  const [addOption, setAddOption] = useState<ChatEndpointTypeOption | null>(null);

  const canAdd = !readOnly && row.addableTypes.length > 0;

  const addControl = canAdd ? (
    <AddCredentialControl displayName={row.displayName} options={row.addableTypes} onSelect={setAddOption} />
  ) : null;

  const addEditor = addOption ? (
    <CredentialJsonEditor<ChannelEndpointPayload>
      initialValue={JSON.stringify(addOption.skeleton, null, 2)}
      saveLabel="Add"
      parse={(raw) => parseEndpointPayload(raw, addOption)}
      onSave={(payload) => onAddItem(row, addOption.type, payload)}
      onCancel={() => setAddOption(null)}
      height="80px"
    />
  ) : null;

  return (
    <CredentialItemsCard<ChatCredentialItem>
      providerId={row.providerId}
      displayName={row.displayName}
      items={row.items}
      addControl={addControl}
      addEditor={addEditor}
      renderItem={(item) => (
        <CredentialJsonRow<ChannelEndpointPayload>
          key={item.id}
          json={JSON.stringify(item.payload, null, 2)}
          ariaEntity={`${row.displayName} credential`}
          readOnly={readOnly}
          parse={parseEndpointPayload}
          onSave={(payload) => onSaveItem(item, payload)}
          onDelete={() => onDeleteItem(item)}
          editorHeight="80px"
        />
      )}
    />
  );
}

type AddCredentialControlProps = {
  displayName: string;
  options: ChatEndpointTypeOption[];
  onSelect: (option: ChatEndpointTypeOption) => void;
};

function AddCredentialControl({ displayName, options, onSelect }: AddCredentialControlProps) {
  if (options.length === 1) {
    return (
      <AddButton
        size="2xs"
        className={cn(iconButtonClassName, 'ml-auto')}
        tooltip="Add credential"
        aria-label={`Add ${displayName} credential`}
        onClick={() => onSelect(options[0])}
      />
    );
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Add ${displayName} credential`}
          className={cn(
            'ml-auto inline-flex cursor-pointer select-none items-center justify-center outline-hidden',
            'text-text-sub transition duration-200 ease-out',
            iconButtonClassName
          )}
        >
          <RiAddLine className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" withPortal={false} className="min-w-40">
        {options.map((option) => (
          <DropdownMenuItem key={option.type} onSelect={() => onSelect(option)}>
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
