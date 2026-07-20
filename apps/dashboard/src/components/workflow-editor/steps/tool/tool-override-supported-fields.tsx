import { getToolProviderOverrideSchema, type ToolContentOverrideProviderId } from '@novu/shared';
import { useMemo } from 'react';
import { RiAddLine, RiCheckLine, RiListUnordered } from 'react-icons/ri';
import { LinkButton } from '@/components/primitives/button-link';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { getToolOverrideProviderDisplayName } from './tool-content-source';

/** Loose view over a single override schema property — the const schemas are unions, so we read them structurally. */
type OverrideFieldSchema = {
  type?: string;
  description?: string;
  enum?: readonly string[];
  maxLength?: number;
  items?: { type?: string };
};

type SupportedField = {
  key: string;
  typeLabel: string;
  description?: string;
  constraints: string[];
};

function getFieldSchemas(providerId: ToolContentOverrideProviderId): Record<string, OverrideFieldSchema> {
  const schema = getToolProviderOverrideSchema(providerId);

  return (schema?.properties ?? {}) as Record<string, OverrideFieldSchema>;
}

function getTypeLabel(fieldSchema: OverrideFieldSchema): string {
  if (fieldSchema.type === 'array') {
    return fieldSchema.items?.type ? `${fieldSchema.items.type}[]` : 'array';
  }

  return fieldSchema.type ?? 'any';
}

function getConstraints(fieldSchema: OverrideFieldSchema): string[] {
  const constraints: string[] = [];

  if (fieldSchema.enum && fieldSchema.enum.length > 0) {
    constraints.push(`One of: ${fieldSchema.enum.join(', ')}`);
  }

  if (fieldSchema.maxLength !== undefined) {
    constraints.push(`Max ${fieldSchema.maxLength.toLocaleString()} characters`);
  }

  return constraints;
}

function buildToolOverrideSupportedFields(providerId: ToolContentOverrideProviderId): SupportedField[] {
  return Object.entries(getFieldSchemas(providerId)).map(([key, fieldSchema]) => ({
    key,
    typeLabel: getTypeLabel(fieldSchema),
    description: fieldSchema.description,
    constraints: getConstraints(fieldSchema),
  }));
}

/** Sensible starting value for a field inserted from the reference list. */
export function getToolOverrideFieldDefaultValue(providerId: ToolContentOverrideProviderId, key: string): unknown {
  const fieldSchema = getFieldSchemas(providerId)[key];

  if (fieldSchema?.enum && fieldSchema.enum.length > 0) {
    return fieldSchema.enum[0];
  }

  switch (fieldSchema?.type) {
    case 'array':
      return [];
    case 'object':
      return {};
    case 'number':
    case 'integer':
      return 0;
    case 'boolean':
      return false;
    default:
      return '';
  }
}

type ToolOverrideSupportedFieldsProps = {
  providerId: ToolContentOverrideProviderId;
  /** Top-level keys already present in the draft — rendered as added and not insertable again. */
  usedKeys: Set<string>;
  /** False while the draft is not parseable JSON; fields stay browsable but cannot be inserted. */
  canInsert: boolean;
  onInsertField: (key: string) => void;
};

export function ToolOverrideSupportedFields({
  providerId,
  usedKeys,
  canInsert,
  onInsertField,
}: ToolOverrideSupportedFieldsProps) {
  const fields = useMemo(() => buildToolOverrideSupportedFields(providerId), [providerId]);

  if (fields.length === 0) {
    return null;
  }

  const displayName = getToolOverrideProviderDisplayName(providerId);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <LinkButton size="sm" variant="gray" leadingIcon={RiListUnordered} className="[&_svg]:size-3">
          Supported fields
        </LinkButton>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="border-b border-neutral-100 px-3 py-2">
          <span className="text-label-xs text-text-strong block">Supported fields</span>
          <p className="text-text-soft text-xs">
            {canInsert
              ? `Click a field to add it to the ${displayName} override.`
              : 'Fix the JSON syntax to insert fields from this list.'}
          </p>
        </div>
        <div className="max-h-80 overflow-y-auto p-1">
          {fields.map((field) => {
            const isUsed = usedKeys.has(field.key);

            return (
              <button
                key={field.key}
                type="button"
                disabled={isUsed || !canInsert}
                onClick={() => {
                  onInsertField(field.key);
                }}
                className="group hover:bg-bg-weak flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left transition-colors disabled:cursor-default disabled:hover:bg-transparent"
              >
                <div className="flex w-full items-center gap-1.5">
                  <code className="text-code-xs text-text-strong">{field.key}</code>
                  <span className="text-text-soft text-[11px]">{field.typeLabel}</span>
                  {isUsed ? (
                    <span className="text-text-soft ml-auto flex items-center gap-0.5 text-[11px]">
                      <RiCheckLine className="size-3" />
                      Added
                    </span>
                  ) : (
                    canInsert && (
                      <RiAddLine className="text-text-soft ml-auto size-3.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
                    )
                  )}
                </div>
                {field.description && <span className="text-text-sub text-xs">{field.description}</span>}
                {field.constraints.length > 0 && (
                  <span className="text-text-soft text-[11px]">{field.constraints.join(' · ')}</span>
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
