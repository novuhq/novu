import { getToolProviderPrimaryContentKey, type ToolContentOverrideProviderId } from '@novu/shared';
import { useMemo } from 'react';
import { RiAddLine, RiCheckLine, RiListUnordered } from 'react-icons/ri';
import { LinkButton } from '@/components/primitives/button-link';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { getToolOverrideProviderDisplayName } from './tool-content-source';
import { getConstraints, getFieldSchemas, getTypeLabel } from './tool-override-field-schema';

const DEFAULT_CONTENT_CHIP_CLASS =
  'text-label-2xs text-foreground-600 bg-neutral-alpha-100 inline-flex h-4 select-none items-center rounded-sm px-1 font-medium';

type SupportedField = {
  key: string;
  typeLabel: string;
  description?: string;
  constraints: string[];
  isDefaultContent: boolean;
};

function buildToolOverrideSupportedFields(providerId: ToolContentOverrideProviderId): SupportedField[] {
  const primaryKey = getToolProviderPrimaryContentKey(providerId);

  return Object.entries(getFieldSchemas(providerId)).map(([key, fieldSchema]) => ({
    key,
    typeLabel: getTypeLabel(fieldSchema),
    description: fieldSchema.description,
    constraints: getConstraints(fieldSchema),
    isDefaultContent: key === primaryKey,
  }));
}

type ToolOverrideSupportedFieldsProps = {
  providerId: ToolContentOverrideProviderId;
  usedKeys: Set<string>;
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
                  {field.isDefaultContent && (
                    <span
                      className={DEFAULT_CONTENT_CHIP_CLASS}
                      title="Falls back to your default message when omitted from the override."
                    >
                      DEFAULT CONTENT
                    </span>
                  )}
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
