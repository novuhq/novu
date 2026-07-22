import { useState } from 'react';
import { type Control, Controller } from 'react-hook-form';
import { RiAddLine, RiDeleteBin2Line } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { Label } from '@/components/primitives/label';
import type { IntegrationFormData } from '../types';

type KeyValueRow = { key: string; value: string };

/** Parses a `headers`/`body` credential value (a JSON object string) into editable rows. */
function jsonToRows(json: unknown): KeyValueRow[] {
  if (typeof json !== 'string' || json.trim().length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(json);

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.entries(parsed).map(([key, value]) => ({ key, value: String(value) }));
    }
  } catch {
    // Malformed JSON (e.g. edited outside the UI) falls back to an empty editor.
  }

  return [];
}

/** Serializes editable rows back into the JSON object string persisted on the credential. */
function rowsToJson(rows: KeyValueRow[]): string {
  const entries = rows.filter((row) => row.key.trim().length > 0);

  if (entries.length === 0) {
    return '';
  }

  const value = entries.reduce<Record<string, string>>((acc, row) => {
    acc[row.key] = row.value;

    return acc;
  }, {});

  return JSON.stringify(value);
}

type ToolWebhookKeyValueFieldProps = {
  control: Control<IntegrationFormData>;
  name: `credentials.${string}`;
  label: string;
  addLabel: string;
  isReadOnly?: boolean;
};

/** Structured key/value editor for a JSON-object-string credential (request headers or body). */
export function ToolWebhookKeyValueField({
  control,
  name,
  label,
  addLabel,
  isReadOnly,
}: ToolWebhookKeyValueFieldProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <ToolWebhookKeyValueRows
          value={field.value}
          onChange={field.onChange}
          label={label}
          addLabel={addLabel}
          isReadOnly={isReadOnly}
        />
      )}
    />
  );
}

type ToolWebhookKeyValueRowsProps = {
  value: unknown;
  onChange: (value: string) => void;
  label: string;
  addLabel: string;
  isReadOnly?: boolean;
};

function ToolWebhookKeyValueRows({ value, onChange, label, addLabel, isReadOnly }: ToolWebhookKeyValueRowsProps) {
  const [rows, setRows] = useState<KeyValueRow[]>(() => jsonToRows(value));

  const commit = (nextRows: KeyValueRow[]) => {
    setRows(nextRows);
    onChange(rowsToJson(nextRows));
  };

  const handleAdd = () => commit([...rows, { key: '', value: '' }]);

  const handleRemove = (index: number) => commit(rows.filter((_, rowIndex) => rowIndex !== index));

  const handleFieldChange = (index: number, field: 'key' | 'value', nextValue: string) =>
    commit(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: nextValue } : row)));

  return (
    <div className="bg-bg-weak flex flex-col gap-1 rounded-lg border border-neutral-100 p-1.5">
      <Label className="px-0.5">{label}</Label>
      <div className="flex flex-col gap-1">
        {rows.map((row, index) => (
          <div key={index} className="flex items-center gap-1">
            <Input
              size="2xs"
              className="w-[160px] shrink-0"
              placeholder="Key"
              value={row.key}
              disabled={isReadOnly}
              onChange={(event) => handleFieldChange(index, 'key', event.target.value)}
            />
            <Input
              size="2xs"
              className="min-w-0 flex-1"
              placeholder="Value"
              value={row.value}
              disabled={isReadOnly}
              onChange={(event) => handleFieldChange(index, 'value', event.target.value)}
            />
            {!isReadOnly && (
              <Button
                type="button"
                variant="error"
                mode="ghost"
                size="2xs"
                className="border ml-0! h-7 w-7 shrink-0 border-neutral-200"
                leadingIcon={RiDeleteBin2Line}
                onClick={() => handleRemove(index)}
                aria-label={`Delete ${label.toLowerCase()} row`}
              />
            )}
          </div>
        ))}

        {!isReadOnly && (
          <Button
            type="button"
            variant="secondary"
            mode="ghost"
            size="2xs"
            className="w-fit gap-1 px-1 text-xs text-text-sub"
            onClick={handleAdd}
          >
            <RiAddLine className="size-3.5" />
            {addLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
