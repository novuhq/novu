import { useState } from 'react';
import { RiAddLine, RiCheckLine, RiCloseLine, RiDeleteBin2Line } from 'react-icons/ri';
import type { ChannelEndpointPayload } from '@/api/channel-endpoints';
import { Button } from '@/components/primitives/button';
import { DeleteButton } from '@/components/primitives/delete-button';
import { EditButton } from '@/components/primitives/edit-button';
import { Input } from '@/components/primitives/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { CREDENTIAL_CARD_CLASS, CREDENTIAL_FIELD_LABEL_CLASS } from './credential-fields';
import { maskCredentialValue } from './mask-credential-value';

type ToolWebhookPayload = {
  url: string;
  headers?: Record<string, string>;
  method?: 'POST' | 'PUT' | 'PATCH';
};

type HeaderRow = { key: string; value: string };

type ToolWebhookDraft = {
  url: string;
  /** Empty string inherits the integration default method. */
  method: string;
  headerRows: HeaderRow[];
};

const HTTP_METHODS = ['POST', 'PUT', 'PATCH'] as const;
const NO_METHOD_OVERRIDE = '__default__';

function payloadToDraft(payload: Partial<ToolWebhookPayload>): ToolWebhookDraft {
  return {
    url: payload.url ?? '',
    method: payload.method ?? '',
    headerRows: Object.entries(payload.headers ?? {}).map(([key, value]) => ({ key, value })),
  };
}

function draftToPayload(draft: ToolWebhookDraft): ToolWebhookPayload {
  const headerEntries = draft.headerRows.filter((row) => row.key.trim().length > 0);
  const headers = headerEntries.reduce<Record<string, string>>((acc, row) => {
    acc[row.key.trim()] = row.value;

    return acc;
  }, {});

  return {
    url: draft.url.trim(),
    ...(draft.method ? { method: draft.method as ToolWebhookPayload['method'] } : {}),
    ...(headerEntries.length > 0 ? { headers } : {}),
  };
}

type ToolWebhookFieldsetProps = {
  draft: ToolWebhookDraft;
  onChange: (next: ToolWebhookDraft) => void;
  showError: boolean;
  disabled?: boolean;
};

function ToolWebhookFieldset({ draft, onChange, showError, disabled }: ToolWebhookFieldsetProps) {
  const handleAddHeader = () => onChange({ ...draft, headerRows: [...draft.headerRows, { key: '', value: '' }] });

  const handleRemoveHeader = (index: number) =>
    onChange({ ...draft, headerRows: draft.headerRows.filter((_, rowIndex) => rowIndex !== index) });

  const handleHeaderChange = (index: number, field: 'key' | 'value', value: string) =>
    onChange({
      ...draft,
      headerRows: draft.headerRows.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)),
    });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <span className={CREDENTIAL_FIELD_LABEL_CLASS}>URL</span>
        <Input
          size="2xs"
          className="font-mono"
          placeholder="https://example.com/webhook"
          value={draft.url}
          hasError={showError}
          autoFocus
          disabled={disabled}
          onChange={(event) => onChange({ ...draft, url: event.target.value })}
        />
        {showError && <span className="text-error-base text-2xs">URL is required</span>}
      </div>

      <div className="flex flex-col gap-1">
        <span className={CREDENTIAL_FIELD_LABEL_CLASS}>Method (optional)</span>
        <Select
          value={draft.method || NO_METHOD_OVERRIDE}
          onValueChange={(value) => onChange({ ...draft, method: value === NO_METHOD_OVERRIDE ? '' : value })}
          disabled={disabled}
        >
          <SelectTrigger className="h-7 text-paragraph-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_METHOD_OVERRIDE}>Use integration default</SelectItem>
            {HTTP_METHODS.map((method) => (
              <SelectItem key={method} value={method}>
                {method}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <span className={CREDENTIAL_FIELD_LABEL_CLASS}>Headers</span>
        {draft.headerRows.map((row, index) => (
          <div key={index} className="flex items-center gap-1">
            <Input
              size="2xs"
              className="w-[120px] shrink-0 font-mono"
              placeholder="Key"
              value={row.key}
              disabled={disabled}
              onChange={(event) => handleHeaderChange(index, 'key', event.target.value)}
            />
            <Input
              size="2xs"
              className="min-w-0 flex-1 font-mono"
              placeholder="Value"
              value={row.value}
              disabled={disabled}
              onChange={(event) => handleHeaderChange(index, 'value', event.target.value)}
            />
            {!disabled && (
              <Button
                type="button"
                variant="error"
                mode="ghost"
                size="2xs"
                className="border ml-0! h-7 w-7 shrink-0 border-neutral-200"
                leadingIcon={RiDeleteBin2Line}
                onClick={() => handleRemoveHeader(index)}
                aria-label="Delete header"
              />
            )}
          </div>
        ))}
        {!disabled && (
          <Button
            type="button"
            variant="secondary"
            mode="ghost"
            size="2xs"
            className="w-fit gap-1 px-1 text-xs text-text-sub"
            onClick={handleAddHeader}
          >
            <RiAddLine className="size-3.5" />
            Add header
          </Button>
        )}
      </div>
    </div>
  );
}

type ToolWebhookFormActionsProps = {
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
};

function ToolWebhookFormActions({ isSaving, onSave, onCancel }: ToolWebhookFormActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        aria-label="Cancel"
        disabled={isSaving}
        onClick={onCancel}
        className="text-error-base hover:bg-error-base/10 inline-flex size-6 shrink-0 cursor-pointer select-none items-center justify-center rounded-full outline-hidden transition duration-200 ease-out disabled:pointer-events-none disabled:opacity-50"
      >
        <RiCloseLine className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Save"
        disabled={isSaving}
        onClick={onSave}
        className="text-success hover:bg-success/10 inline-flex size-6 shrink-0 cursor-pointer select-none items-center justify-center rounded-full outline-hidden transition duration-200 ease-out disabled:pointer-events-none disabled:opacity-50"
      >
        <RiCheckLine className="size-4" />
      </button>
    </div>
  );
}

type ToolWebhookCredentialFormEditorProps = {
  onSave: (payload: ChannelEndpointPayload) => Promise<boolean>;
  onCancel: () => void;
};

export function ToolWebhookCredentialFormEditor({ onSave, onCancel }: ToolWebhookCredentialFormEditorProps) {
  const [draft, setDraft] = useState<ToolWebhookDraft>({ url: '', method: '', headerRows: [] });
  const [showError, setShowError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (draft.url.trim().length === 0) {
      setShowError(true);

      return;
    }

    setIsSaving(true);
    const succeeded = await onSave(draftToPayload(draft) as ChannelEndpointPayload);
    setIsSaving(false);

    if (succeeded) {
      onCancel();
    }
  };

  return (
    <div className={CREDENTIAL_CARD_CLASS}>
      <ToolWebhookFieldset draft={draft} onChange={setDraft} showError={showError} disabled={isSaving} />
      <ToolWebhookFormActions isSaving={isSaving} onSave={handleSave} onCancel={onCancel} />
    </div>
  );
}

type ToolWebhookCredentialFormRowProps = {
  payload: ChannelEndpointPayload;
  ariaEntity: string;
  readOnly: boolean;
  valuesVisible?: boolean;
  onSave: (payload: ChannelEndpointPayload) => Promise<boolean>;
  onDelete: () => void;
};

export function ToolWebhookCredentialFormRow({
  payload,
  ariaEntity,
  readOnly,
  valuesVisible = false,
  onSave,
  onDelete,
}: ToolWebhookCredentialFormRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ToolWebhookDraft>({ url: '', method: '', headerRows: [] });
  const [showError, setShowError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const webhookPayload = payload as Partial<ToolWebhookPayload>;
  const headerEntries = Object.entries(webhookPayload.headers ?? {});

  const handleEdit = () => {
    setDraft(payloadToDraft(webhookPayload));
    setIsEditing(true);
  };

  const handleCancel = () => {
    setShowError(false);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (draft.url.trim().length === 0) {
      setShowError(true);

      return;
    }

    setIsSaving(true);
    const succeeded = await onSave(draftToPayload(draft) as ChannelEndpointPayload);
    setIsSaving(false);

    if (succeeded) {
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className={CREDENTIAL_CARD_CLASS}>
        <ToolWebhookFieldset draft={draft} onChange={setDraft} showError={showError} disabled={isSaving} />
        <ToolWebhookFormActions isSaving={isSaving} onSave={handleSave} onCancel={handleCancel} />
      </div>
    );
  }

  return (
    <div className={CREDENTIAL_CARD_CLASS}>
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={CREDENTIAL_FIELD_LABEL_CLASS}>URL</span>
          <span className="text-paragraph-xs font-mono text-text-sub truncate">{webhookPayload.url || '-'}</span>
        </div>
        {!readOnly && (
          <div className="flex shrink-0 items-center gap-1">
            <EditButton
              size="2xs"
              className="p-0.5 hover:bg-transparent"
              aria-label={`Edit ${ariaEntity}`}
              onClick={handleEdit}
            />
            <DeleteButton
              size="2xs"
              className="p-0.5 hover:bg-transparent"
              aria-label={`Delete ${ariaEntity}`}
              onClick={onDelete}
            />
          </div>
        )}
      </div>
      {webhookPayload.method && (
        <div className="flex flex-col gap-1">
          <span className={CREDENTIAL_FIELD_LABEL_CLASS}>Method</span>
          <span className="text-paragraph-xs font-mono text-text-sub">{webhookPayload.method}</span>
        </div>
      )}
      {headerEntries.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className={CREDENTIAL_FIELD_LABEL_CLASS}>Headers</span>
          {headerEntries.map(([key, value]) => (
            <div key={key} className="flex items-center gap-1 text-paragraph-xs font-mono text-text-sub">
              <span className="w-[120px] shrink-0 truncate">{key}</span>
              <span className="min-w-0 flex-1 truncate">{valuesVisible ? value : maskCredentialValue(value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
