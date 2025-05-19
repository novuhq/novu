import { useCallback, useEffect } from 'react';
import { useForm, useFieldArray, type Control, type FieldArrayWithId, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { v4 as uuidv4 } from 'uuid';

import type { JSONSchema7, JSONSchema7TypeName } from './json-schema';
import { newProperty } from './utils/json-helpers';
import { editorSchema, type SchemaEditorFormValues, type PropertyListItem } from './utils/validation-schema';
import type { IWorkflow } from '@novu/shared';

interface UseSchemaFormProps {
  initialSchema?: JSONSchema7;
  onChange?: (schema: JSONSchema7) => void;
  onValidityChange?: (isValid: boolean) => void;
}

type SchemaFormPath =
  | 'propertyList'
  | `propertyList.${number}.keyName`
  | `propertyList.${number}.definition`
  | `propertyList.${number}.isRequired`;

interface UseSchemaFormReturn {
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

export function convertSchemaToPropertyList(
  schemaProperties?: JSONSchema7['properties'],
  requiredArray?: string[]
): PropertyListItem[] {
  if (!schemaProperties) {
    return [];
  }

  return Object.entries(schemaProperties).map(([key, value]) => {
    const definition = value as JSONSchema7;
    let nestedPropertyList: PropertyListItem[] | undefined = undefined;
    const definitionForListItem: JSONSchema7 = { ...definition };

    if (definition.type === 'object' && definition.properties) {
      nestedPropertyList = convertSchemaToPropertyList(definition.properties, definition.required);
      delete definitionForListItem.properties;
    }

    return {
      id: uuidv4(),
      keyName: key,
      definition: {
        ...definitionForListItem,
        ...(nestedPropertyList ? { propertyList: nestedPropertyList } : {}),
      },
      isRequired: requiredArray?.includes(key) || false,
    };
  });
}

function convertPropertyListToSchema(propertyList?: PropertyListItem[]): {
  properties: JSONSchema7['properties'];
  required?: string[];
} {
  if (!propertyList || propertyList.length === 0) {
    return { properties: {} };
  }

  const properties: JSONSchema7['properties'] = {};
  const required: string[] = [];

  propertyList.forEach((item) => {
    if (item.keyName.trim() !== '') {
      const currentDefinition = { ...item.definition };
      let nestedRequired: string[] | undefined;

      const definitionAsObjectWithList = currentDefinition as JSONSchema7 & { propertyList?: PropertyListItem[] };

      if (
        definitionAsObjectWithList.type === 'object' &&
        definitionAsObjectWithList.propertyList &&
        definitionAsObjectWithList.propertyList.length > 0
      ) {
        const nestedConversion = convertPropertyListToSchema(definitionAsObjectWithList.propertyList);
        currentDefinition.properties = nestedConversion.properties;
        nestedRequired = nestedConversion.required;
      } else if (currentDefinition.type === 'object' && !currentDefinition.properties) {
        currentDefinition.properties = {};
      }

      if (nestedRequired && nestedRequired.length > 0) {
        currentDefinition.required = nestedRequired;
      } else {
        delete currentDefinition.required;
      }

      delete (currentDefinition as any).propertyList;
      properties[item.keyName] = currentDefinition;

      if (item.isRequired) {
        required.push(item.keyName);
      }
    }
  });
  return { properties, ...(required.length > 0 ? { required } : {}) };
}

const defaultFormValues: SchemaEditorFormValues = {
  propertyList: [],
};

export function useSchemaForm({ initialSchema, onChange, onValidityChange }: UseSchemaFormProps): UseSchemaFormReturn {
  const initialTransformedValues: SchemaEditorFormValues = {
    propertyList: initialSchema?.properties
      ? convertSchemaToPropertyList(initialSchema.properties, initialSchema.required)
      : defaultFormValues.propertyList,
  };

  const methods = useForm<SchemaEditorFormValues>({
    defaultValues: initialTransformedValues,
    resolver: zodResolver(editorSchema),
    mode: 'onChange',
  });

  const { control, watch, formState, getValues, setValue } = methods;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'propertyList',
    keyName: 'fieldId',
  });

  useEffect(() => {
    if (onValidityChange) {
      onValidityChange(formState.isValid);
    }
  }, [formState.isValid, onValidityChange]);

  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;
    const subscription = watch((value) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (onChange && value.propertyList) {
          const { properties, required } = convertPropertyListToSchema(value.propertyList as PropertyListItem[]);

          const outputSchema: JSONSchema7 = {
            type: 'object',
            properties,
            ...(required && required.length > 0 ? { required } : {}),
          };
          onChange(outputSchema);
        }
      }, 300);
    });

    return () => {
      clearTimeout(debounceTimer);
      subscription.unsubscribe();
    };
  }, [watch, onChange]);

  const addProperty = useCallback(
    (propertyData?: Partial<PropertyListItem>, type?: JSONSchema7TypeName) => {
      append({
        id: uuidv4(),
        keyName: '',
        definition: newProperty(type || 'string'),
        isRequired: false,
        ...propertyData,
      } as PropertyListItem);
    },
    [append]
  );

  const removeProperty = useCallback(
    (index: number) => {
      remove(index);
    },
    [remove]
  );

  const getCurrentSchema = useCallback((): JSONSchema7 => {
    const propertyList = getValues().propertyList as PropertyListItem[];
    const { properties, required } = convertPropertyListToSchema(propertyList);

    return {
      type: 'object',
      properties,
      ...(required && required.length > 0 ? { required } : {}),
    };
  }, [getValues]);

  return {
    control,
    fields,
    formState,
    addProperty,
    removeProperty,
    getCurrentSchema,
    getValues: () => getValues(),
    setValue: (name, value) => setValue(name, value),
    methods,
  };
}
