import { getToolProviderPrimaryContentKey } from '@novu/shared';
import { useMemo } from 'react';
import { RiAddLine, RiCheckLine, RiErrorWarningLine, RiListUnordered } from 'react-icons/ri';
import { LinkButton } from '@/components/primitives/button-link';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import {
  type DashboardToolContentOverrideProviderId,
  getToolOverrideProviderDisplayName,
  WEBHOOK_TOOL_PROVIDER_ID,
} from './tool-content-source';
import { getConstraints, getFieldSchemas, getTypeLabel, type OverrideFieldSchema } from './tool-override-field-schema';
import { type WebhookSchemaConflict } from './webhook-payload-schema';

const DEFAULT_CONTENT_CHIP_CLASS =
  'text-label-2xs text-foreground-600 bg-neutral-alpha-100 inline-flex h-4 select-none items-center rounded-sm px-1 font-medium';

type SupportedField = {
  key: string;
  typeLabel: string;
  description?: string;
  constraints: string[];
  isDefaultContent: boolean;
  sources: string[];
  conflicts: WebhookSchemaConflict[];
};

function buildToolOverrideSupportedFields(
  providerId: DashboardToolContentOverrideProviderId,
  schemaOverride?: Record<string, OverrideFieldSchema>
): SupportedField[] {
  const primaryKey = providerId === WEBHOOK_TOOL_PROVIDER_ID ? undefined : getToolProviderPrimaryContentKey(providerId);

  return Object.entries(schemaOverride ?? getFieldSchemas(providerId)).map(([key, fieldSchema]) => ({
    key,
    typeLabel: getTypeLabel(fieldSchema),
    description: fieldSchema.description,
    constraints: getConstraints(fieldSchema),
    isDefaultContent: key === primaryKey,
    sources: fieldSchema.sources ?? [],
    conflicts: fieldSchema.conflicts ?? [],
  }));
}

type ToolOverrideSupportedFieldsProps = {
  providerId: DashboardToolContentOverrideProviderId;
  fieldSchemas?: Record<string, OverrideFieldSchema>;
  usedKeys: Set<string>;
  canInsert: boolean;
  onInsertField: (key: string) => void;
};

export function ToolOverrideSupportedFields({
  providerId,
  fieldSchemas,
  usedKeys,
  canInsert,
  onInsertField,
}: ToolOverrideSupportedFieldsProps) {
  const fields = useMemo(() => buildToolOverrideSupportedFields(providerId, fieldSchemas), [fieldSchemas, providerId]);

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
                  {field.conflicts.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className="text-warning-base inline-flex"
                          role="img"
                          aria-label={`Conflicting types for ${field.key}`}
                        >
                          <RiErrorWarningLine className="size-3.5" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {field.conflicts.map(({ source, type }) => `${source}: ${type}`).join(' · ')}
                      </TooltipContent>
                    </Tooltip>
                  )}
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
                {field.sources.length > 0 && (
                  <span className="text-text-soft text-[11px]">From {field.sources.join(', ')}</span>
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
