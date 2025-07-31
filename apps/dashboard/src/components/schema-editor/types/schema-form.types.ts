import type { Control, FieldArrayWithId, UseFormReturn } from 'react-hook-form';
import type { JSONSchema7, JSONSchema7TypeName } from '../json-schema';
import type { PropertyListItem, SchemaEditorFormValues } from '../utils/validation-schema';

export type SchemaFormPath =
  | 'propertyList'
  | `propertyList.${number}.keyName`
  | `propertyList.${number}.definition`
  | `propertyList.${number}.isRequired`;

export interface UseSchemaFormProps {
  initialSchema?: JSONSchema7;
  onChange?: (schema: JSONSchema7) => void;
  onValidityChange?: (isValid: boolean) => void;
}

export interface UseSchemaFormReturn {
  control: Control<SchemaEditorFormValues>;
  fields: FieldArrayWithId<SchemaEditorFormValues, 'propertyList', 'fieldId'>[];
  formState: {
    isValid: boolean;
    errors: Record<string, any>;
  };
  addProperty: (propertyData?: Partial<PropertyListItem>, type?: JSONSchema7TypeName) => void;
  removeProperty: (index: number) => void;
  getCurrentSchema: () => JSONSchema7;
  getValues: () => SchemaEditorFormValues;
  setValue: (name: SchemaFormPath, value: any) => void;
  methods: UseFormReturn<SchemaEditorFormValues>;
}
