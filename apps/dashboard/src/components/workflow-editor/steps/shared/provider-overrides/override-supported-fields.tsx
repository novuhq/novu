import { getProviderPrimaryContentKey } from '@novu/shared';
import { useMemo } from 'react';
import { RiAddLine, RiCheckLine, RiListUnordered } from 'react-icons/ri';
import { LinkButton } from '@/components/primitives/button-link';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { type AnnotateOverrideField, getConstraints, type OverrideFieldSchema } from './override-field-schema';
import { DISCRIMINATOR_KEY, type SchemaResolver, type UnionBranchSummary } from './schema-resolver';

const DEFAULT_CONTENT_CHIP_CLASS =
  'text-label-2xs text-foreground-600 bg-neutral-alpha-100 inline-flex h-4 select-none items-center rounded-sm px-1 font-medium';

/** `-mx-1 px-3` cancels the group's horizontal padding so the pinned header covers the full scroll width. */
const STICKY_GROUP_HEADER_CLASS =
  'text-text-soft sticky top-0 z-10 -mx-1 border-b border-neutral-100 bg-background px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide';

type SupportedField = {
  key: string;
  typeLabel: string;
  description?: string;
  constraints: string[];
  isDefaultContent: boolean;
  fieldSchema: OverrideFieldSchema;
};

type ReferenceSection = {
  propertyKey: string;
  branches: UnionBranchSummary[];
};

function buildSupportedFields(providerId: string, resolver: SchemaResolver): SupportedField[] {
  const primaryKey = getProviderPrimaryContentKey(providerId);

  return Object.entries(resolver.rootSchema.properties ?? {}).map(([key, fieldSchema]) => {
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

/**
 * Root array properties whose items are a discriminated union (e.g. Slack `blocks` → KnownBlock).
 * Shown as informational reference only — clicking does not insert into the editor.
 */
function buildReferenceSections(resolver: SchemaResolver): ReferenceSection[] {
  const sections: ReferenceSection[] = [];

  for (const [propertyKey, fieldSchema] of Object.entries(resolver.rootSchema.properties ?? {})) {
    if (resolver.describedNode(fieldSchema).type !== 'array') {
      continue;
    }

    const branches = resolver.unionBranchSummaries(resolver.itemsNode(fieldSchema));
    if (branches.length < 2) {
      continue;
    }

    sections.push({ propertyKey, branches });
  }

  return sections;
}

type OverrideSupportedFieldsProps = {
  providerId: string;
  displayName: string;
  /** Undefined when the provider has no browsable schema, which hides the popover entirely. */
  resolver: SchemaResolver | undefined;
  usedKeys: Set<string>;
  canInsert: boolean;
  annotateField?: AnnotateOverrideField;
  onInsertField: (key: string) => void;
};

export function OverrideSupportedFields({
  providerId,
  displayName,
  resolver,
  usedKeys,
  canInsert,
  annotateField,
  onInsertField,
}: OverrideSupportedFieldsProps) {
  const fields = useMemo(() => (resolver ? buildSupportedFields(providerId, resolver) : []), [providerId, resolver]);
  const referenceSections = useMemo(() => (resolver ? buildReferenceSections(resolver) : []), [resolver]);

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
        <div className="max-h-80 overflow-y-auto">
          {/* Each group is its own containing block so its sticky header unsticks once the group scrolls away. */}
          <div className="p-1">
            {referenceSections.length > 0 && <div className={STICKY_GROUP_HEADER_CLASS}>Fields</div>}
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

          {referenceSections.map((section) => (
            <div key={section.propertyKey} className="border-t border-neutral-100 p-1">
              <div className={STICKY_GROUP_HEADER_CLASS}>
                {section.propertyKey}
                <span className="ml-1.5 font-normal normal-case tracking-normal">· reference</span>
              </div>
              <p className="text-text-soft px-2 py-1 text-[11px]">
                Set <code className="text-code-xs">{DISCRIMINATOR_KEY}</code> inside{' '}
                <code className="text-code-xs">{section.propertyKey}</code> to use one of these. Not inserted from this
                list.
              </p>
              {section.branches.map((branch) => (
                <div key={branch.typeValue} className="flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5">
                  <code className="text-code-xs text-text-strong">{branch.typeValue}</code>
                  {branch.description && <span className="text-text-sub text-xs">{branch.description}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
