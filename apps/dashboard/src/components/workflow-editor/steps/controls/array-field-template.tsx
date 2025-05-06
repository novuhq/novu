import { CollapsibleContent, CollapsibleTrigger } from '@/components/primitives/collapsible';
import { Collapsible } from '@radix-ui/react-collapsible';
import { ArrayFieldTemplateProps, getTemplate, getUiOptions } from '@rjsf/utils';
import { useMemo, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { RiExpandUpDownLine } from 'react-icons/ri';
import { getFieldName } from './template-utils';

export function ArrayFieldTemplate(props: ArrayFieldTemplateProps) {
  const { disabled, idSchema, uiSchema, items, onAddClick, readonly, registry, required, title, schema, canAdd } =
    props;
  const {
    ButtonTemplates: { AddButton },
  } = registry.templates;
  const uiOptions = useMemo(() => getUiOptions(uiSchema), [uiSchema]);
  const ArrayFieldTitleTemplate = useMemo(
    () => getTemplate('ArrayFieldTitleTemplate', registry, uiOptions),
    [registry, uiOptions]
  );
  const ArrayFieldItemTemplate = useMemo(
    () => getTemplate('ArrayFieldItemTemplate', registry, uiOptions),
    [registry, uiOptions]
  );

  const [isEditorOpen, setIsEditorOpen] = useState(true);

  const handleAddClick = () => {
    if (!isEditorOpen) {
      setIsEditorOpen(true);
    }

    onAddClick();
    /**
     * If the array field has a default value, append it to the array
     */
    const defaultValue = schema.default ?? undefined;
    const value = Array.isArray(defaultValue) ? defaultValue[0] : defaultValue;
    append(value);
  };

  const { control } = useFormContext();
  const extractedName = useMemo(() => getFieldName(idSchema.$id), [idSchema.$id]);

  const { append, remove } = useFieldArray({
    control,
    name: extractedName,
  });

  return (
    <Collapsible
      open={isEditorOpen}
      onOpenChange={setIsEditorOpen}
      className="bg-background border-neutral-alpha-200 relative mt-2 flex w-full flex-col gap-2 rounded-lg border px-3 py-4 data-[state=closed]:rounded-none data-[state=closed]:border-b-0 data-[state=closed]:border-l-0 data-[state=closed]:border-r-0 data-[state=closed]:border-t data-[state=closed]:pb-0"
    >
      <div className="absolute left-0 top-0 z-10 flex w-full -translate-y-1/2 items-center justify-between p-0 px-2 text-sm">
        <div className="flex w-full items-center gap-1">
          <span className="bg-background px-1">
            <ArrayFieldTitleTemplate
              idSchema={idSchema}
              title={uiOptions.title || title}
              schema={schema}
              uiSchema={uiSchema}
              required={required}
              registry={registry}
            />
          </span>
          <div className="bg-background text-foreground-600 -mt-px ml-auto mr-4 flex items-center gap-1">
            {canAdd && <AddButton onClick={handleAddClick} disabled={disabled || readonly} registry={registry} />}
            <CollapsibleTrigger className="hover:bg-accent size-4 rounded-sm p-0.5">
              <RiExpandUpDownLine className="text-foreground-600 size-3" />
            </CollapsibleTrigger>
          </div>
        </div>
      </div>

      <CollapsibleContent className="flex flex-col gap-3">
        {items.map(({ key, onDropIndexClick, ...itemProps }) => {
          return (
            <ArrayFieldItemTemplate
              key={key}
              {...itemProps}
              onDropIndexClick={(index) => {
                remove(index);
                return onDropIndexClick(index);
              }}
            />
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}
