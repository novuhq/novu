import { RiAddLine } from 'react-icons/ri';
import { FormProvider, type Control, type FieldArrayWithId, type UseFormReturn } from 'react-hook-form';

import { Button } from '@/components/primitives/button';
import type { JSONSchema7 } from './json-schema';
import { SchemaPropertyRow } from './schema-property-row';
import type { SchemaEditorFormValues, PropertyListItem } from './utils/validation-schema';

interface SchemaEditorProps {
  control: Control<SchemaEditorFormValues>;
  fields: FieldArrayWithId<SchemaEditorFormValues, 'propertyList', 'fieldId'>[];
  formState: {
    isValid: boolean;
    errors: Record<string, any>;
  };
  addProperty: (propertyData?: Partial<PropertyListItem>, type?: any) => void;
  removeProperty: (index: number) => void;
  methods: UseFormReturn<SchemaEditorFormValues>;
  highlightedPropertyKey?: string | null;
}

export function SchemaEditor({
  control,
  fields,
  formState,
  addProperty,
  removeProperty,
  methods,
  highlightedPropertyKey,
}: SchemaEditorProps) {
  return (
    <FormProvider {...methods}>
      <div className="rounded-4 bg-bg-white border border-neutral-100 p-2 px-[2px]">
        {fields.map((field, index) => (
          <SchemaPropertyRow
            key={field.fieldId}
            control={control}
            index={index}
            pathPrefix={`propertyList.${index}`}
            onDeleteProperty={() => removeProperty(index)}
            indentationLevel={0}
            highlightedPropertyKey={highlightedPropertyKey}
          />
        ))}
        <Button
          variant="secondary"
          mode="lighter"
          size="2xs"
          onClick={() => addProperty()}
          className="mt-2"
          leadingIcon={RiAddLine}
          disabled={!formState.isValid && fields.length > 0}
        >
          Add property
        </Button>
      </div>
    </FormProvider>
  );
}
