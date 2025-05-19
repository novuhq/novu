import { RiAddLine } from 'react-icons/ri';
import { FormProvider } from 'react-hook-form';

import { Button } from '@/components/primitives/button';
import type { JSONSchema7 } from './json-schema';
import { SchemaPropertyRow } from './schema-property-row';
import { useSchemaForm } from './use-schema-form';

interface SchemaEditorProps {
  initialSchema?: JSONSchema7;
  onChange?: (schema: JSONSchema7) => void;
  onValidityChange?: (isValid: boolean) => void;
}

export function SchemaEditor({ initialSchema, onChange, onValidityChange }: SchemaEditorProps) {
  const { control, fields, formState, addProperty, removeProperty, methods } = useSchemaForm({
    initialSchema,
    onChange,
    onValidityChange,
  });

  return (
    <FormProvider {...methods}>
      <div className="rounded-4 bg-bg-white border border-neutral-100 p-2">
        {fields.map((field, index) => (
          <SchemaPropertyRow
            key={field.fieldId}
            control={control}
            index={index}
            pathPrefix={`propertyList.${index}`}
            onDeleteProperty={() => removeProperty(index)}
            indentationLevel={0}
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
