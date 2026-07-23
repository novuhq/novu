import { type ReactNode, useState } from 'react';
import { type Control, Controller } from 'react-hook-form';
import { RiAddLine, RiDeleteBin2Line, RiInformation2Line } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import type { IntegrationFormData } from '../types';

type KeyValueRow = { key: string; value: string };

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
    // Malformed JSON falls back to an empty editor.
  }

  return [];
}

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

type ToolWebhookFieldLabelProps = {
  children: ReactNode;
  tooltip?: string;
  optional?: boolean;
};

export function ToolWebhookFieldLabel({ children, tooltip, optional }: ToolWebhookFieldLabelProps) {
  return (
    <div className="flex items-center gap-1 py-1">
      <span className="text-text-sub text-xs font-medium">{children}</span>
      {optional && <span className="text-text-soft text-xs font-normal">(optional)</span>}
      {tooltip && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="flex items-center">
              <RiInformation2Line className="text-text-soft size-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{tooltip}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

type ToolWebhookKeyValueFieldProps = {
  control: Control<IntegrationFormData>;
  name: `credentials.${string}`;
  label: string;
  addLabel: string;
  tooltip?: string;
  isReadOnly?: boolean;
};

export function ToolWebhookKeyValueField({
  control,
  name,
  label,
  addLabel,
  tooltip,
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
          tooltip={tooltip}
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
  tooltip?: string;
  isReadOnly?: boolean;
};

function ToolWebhookKeyValueRows({
  value,
  onChange,
  label,
  addLabel,
  tooltip,
  isReadOnly,
}: ToolWebhookKeyValueRowsProps) {
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
    <div className="flex flex-col gap-1">
      <ToolWebhookFieldLabel tooltip={tooltip}>{label}</ToolWebhookFieldLabel>
      <div className="flex flex-col gap-1">
        {rows.map((row, index) => (
          <div key={index} className="flex items-center gap-1">
            <Input
              size="2xs"
              className="w-[200px] shrink-0"
              placeholder="key..."
              value={row.key}
              disabled={isReadOnly}
              onChange={(event) => handleFieldChange(index, 'key', event.target.value)}
            />
            <Input
              size="2xs"
              className="min-w-0 flex-1"
              placeholder="Insert value..."
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
            className="text-text-sub w-fit gap-1 px-1 text-xs"
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
