import { getProviderPrimaryContentKey } from '@novu/shared';
import { useMemo } from 'react';
import { RiAddLine, RiCheckLine, RiListUnordered } from 'react-icons/ri';
import { LinkButton } from '@/components/primitives/button-link';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { type AnnotateOverrideField, getConstraints, type OverrideFieldSchema } from './override-field-schema';
import { createSchemaResolver } from './schema-resolver';

const DEFAULT_CONTENT_CHIP_CLASS =
  'text-label-2xs text-foreground-600 bg-neutral-alpha-100 inline-flex h-4 select-none items-center rounded-sm px-1 font-medium';

type SupportedField = {
  key: string;
  typeLabel: string;
  description?: string;
  constraints: string[];
  isDefaultContent: boolean;
  fieldSchema: OverrideFieldSchema;
};

function buildSupportedFields(providerId: string, rootSchema: OverrideFieldSchema): SupportedField[] {
  const primaryKey = getProviderPrimaryContentKey(providerId);
  const resolver = createSchemaResolver(rootSchema);

  return Object.entries(rootSchema.properties ?? {}).map(([key, fieldSchema]) => {
    const described = resolver.describedNode(fieldSchema);

    return {
      key,
      typeLabel: resolver.typeLabel(fieldSchema),
      description: described.description,
      constraints: getConstraints(described),
      isDefaultContent: key === primaryKey,
      fieldSchema,
    };
  });
}

type OverrideSupportedFieldsProps = {
  providerId: string;
  displayName: string;
  rootSchema: OverrideFieldSchema | undefined;
  usedKeys: Set<string>;
  canInsert: boolean;
  annotateField?: AnnotateOverrideField;
  onInsertField: (key: string) => void;
};

export function OverrideSupportedFields({
  providerId,
  displayName,
  rootSchema,
  usedKeys,
  canInsert,
  annotateField,
  onInsertField,
}: OverrideSupportedFieldsProps) {
  const fields = useMemo(
    () => (rootSchema ? buildSupportedFields(providerId, rootSchema) : []),
    [providerId, rootSchema]
  );

  if (fields.length === 0) {
    return null;
  }

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
            const annotations = annotateField?.(field.key, field.fieldSchema);

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
                  {annotations?.badge}
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
                {annotations?.footnote}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
