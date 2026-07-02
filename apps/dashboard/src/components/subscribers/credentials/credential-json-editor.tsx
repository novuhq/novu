import { useMemo, useState } from 'react';
import { Button } from '@/components/primitives/button';
import { Editor } from '@/components/primitives/editor';

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

type CredentialJsonEditorProps<T> = {
  initialValue: string;
  saveLabel: string;
  /** Validates/transforms the raw editor text into the value passed to {@link onSave}. */
  parse: (raw: string) => ParseResult<T>;
  onSave: (value: T) => Promise<boolean>;
  onCancel: () => void;
  height?: string;
};

/**
 * Inline JSON editor for a single credential item (device token, chat endpoint, ...).
 * Emits `data-dirty="true"` while the draft differs from its initial value so the
 * surrounding drawer form surfaces the unsaved-changes prompt.
 */
export function CredentialJsonEditor<T>({
  initialValue,
  saveLabel,
  parse,
  onSave,
  onCancel,
  height = '80px',
}: CredentialJsonEditorProps<T>) {
  const [draft, setDraft] = useState(initialValue);
  const [showError, setShowError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const parseResult = useMemo(() => parse(draft), [parse, draft]);
  const hasUnsavedCredential = !isSaving && draft !== initialValue;

  const save = async () => {
    if (!parseResult.ok) {
      setShowError(true);

      return;
    }

    setIsSaving(true);
    const succeeded = await onSave(parseResult.value);
    setIsSaving(false);

    if (succeeded) {
      onCancel();
    }
  };

  return (
    <div className="bg-bg-white flex flex-col gap-1.5 rounded-md p-1.5 shadow-xs">
      {hasUnsavedCredential && <span hidden data-dirty="true" />}
      <div className="border-stroke-soft bg-bg-weak focus-within:border-stroke-strong overflow-hidden rounded-md border p-1.5 transition-colors">
        <Editor
          value={draft}
          onChange={setDraft}
          multiline
          lineNumbers
          size="sm"
          height={height}
          fontFamily="inherit"
          placeholder="{}"
          autoFocus
        />
      </div>
      {showError && !parseResult.ok && <span className="text-error-base text-2xs">{parseResult.error}</span>}
      <div className="flex items-center justify-end gap-1.5">
        <Button type="button" size="2xs" mode="outline" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="2xs" variant="primary" isLoading={isSaving} onClick={save}>
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}
