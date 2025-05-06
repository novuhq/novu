import { useMemo, useState } from 'react';
import { RiExpandUpDownLine } from 'react-icons/ri';
import { useFormContext } from 'react-hook-form';
import { getTemplate, getUiOptions, ObjectFieldTemplateProps } from '@rjsf/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/primitives/collapsible';
import { getFieldName, ROOT_DELIMITER } from './template-utils';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/primitives/form/form';

export function ObjectFieldTemplate(props: ObjectFieldTemplateProps) {
  const { idSchema, uiSchema, registry, required, title, schema, properties } = props;

  const uiOptions = getUiOptions(uiSchema);

  const ArrayFieldTitleTemplate = getTemplate('ArrayFieldTitleTemplate', registry, uiOptions);

  const [isEditorOpen, setIsEditorOpen] = useState(true);

  const sectionTitle = uiOptions.title || title;

  const { control } = useFormContext();
  const extractedName = useMemo(() => getFieldName(idSchema.$id) + '.' + ROOT_DELIMITER, [idSchema.$id]);

  if (!sectionTitle) {
    return properties.map((element) => {
      return <div key={element.name}>{element.content}</div>;
    });
  }

  return (
    <FormField
      control={control}
      name={extractedName}
      render={() => (
        <FormItem>
          <FormControl>
            <Collapsible
              open={isEditorOpen}
              onOpenChange={setIsEditorOpen}
              className="bg-background border-neutral-alpha-200 relative mt-2 flex w-full flex-col gap-2 border-t px-3 py-4 pb-0"
            >
              <div className="absolute left-0 top-0 z-10 flex w-full -translate-y-1/2 items-center justify-between p-0 text-sm">
                <div className="-mt-px flex w-full items-center gap-1">
                  <span className="bg-background ml-3 px-1">
                    <ArrayFieldTitleTemplate
                      idSchema={idSchema}
                      title={sectionTitle}
                      schema={schema}
                      uiSchema={uiSchema}
                      required={required}
                      registry={registry}
                    />
                  </span>
                  <div className="bg-background text-foreground-600 ml-auto flex items-center gap-1">
                    <CollapsibleTrigger
                      className="hover:bg-accent flex size-4 items-center justify-center rounded-sm p-0.5"
                      title="Collapse section"
                    >
                      <RiExpandUpDownLine className="text-foreground-600 size-3" />
                    </CollapsibleTrigger>
                  </div>
                </div>
              </div>

              <CollapsibleContent className="flex flex-col gap-3">
                {properties.map((element) => {
                  return (
                    <div key={element.name} className="ml-1">
                      {element.content}
                    </div>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
