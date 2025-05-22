import { useCallback, useEffect } from 'react';
import { useForm, useFieldArray, type Control, type FieldArrayWithId, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { v4 as uuidv4 } from 'uuid';

import type { JSONSchema7, JSONSchema7TypeName } from './json-schema';
import { newProperty } from './utils/json-helpers';
import { editorSchema, type SchemaEditorFormValues, type PropertyListItem } from './utils/validation-schema';

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
    (propertyDataFromArg?: Partial<PropertyListItem>, typeFromArg?: JSONSchema7TypeName) => {
      const fullPath = propertyDataFromArg?.keyName;
      const defaultType = typeFromArg || 'string';

      if (!fullPath || fullPath.trim() === '') {
        console.error('Property keyName path cannot be empty.');

        return;
      }

      const pathSegments = fullPath.split('.');
      const newKeyName = pathSegments[pathSegments.length - 1];
      const parentPathArray = pathSegments.slice(0, -1);

      if (newKeyName.trim() === '') {
        console.error('The final key name in the path cannot be empty.');

        return;
      }

      const propertyDefinition = propertyDataFromArg?.definition || newProperty(defaultType);
      const propertyIsRequired =
        typeof propertyDataFromArg?.isRequired === 'boolean' ? propertyDataFromArg.isRequired : false;
      const propertyId = propertyDataFromArg?.id || uuidv4();

      if (parentPathArray.length === 0) {
        const currentRootPropertyList: PropertyListItem[] = getValues().propertyList || [];

        if (currentRootPropertyList.some((p) => p.keyName === newKeyName)) {
          console.warn(`Property "${newKeyName}" already exists at the root level.`);
          return;
        }

        append({
          id: propertyId,
          keyName: newKeyName,
          definition: propertyDefinition,
          isRequired: propertyIsRequired,
        });
      } else {
        const currentRootPropertyList: PropertyListItem[] = JSON.parse(JSON.stringify(getValues().propertyList || []));
        let targetParentPropertyDefinitionList: PropertyListItem[] = currentRootPropertyList;

        for (const segment of parentPathArray) {
          if (segment.trim() === '') {
            console.error(`Invalid empty segment in path: "${fullPath}"`);

            return;
          }

          let parentPropertyItem = targetParentPropertyDefinitionList.find((p) => p.keyName === segment);

          if (!parentPropertyItem) {
            const newParentSchemaDefinition: JSONSchema7 = {
              type: 'object',
              properties: {},
            };
            parentPropertyItem = {
              id: uuidv4(),
              keyName: segment,
              definition: { ...newParentSchemaDefinition, propertyList: [] as PropertyListItem[] } as JSONSchema7,
              isRequired: false,
            };
            targetParentPropertyDefinitionList.push(parentPropertyItem);
          } else if (parentPropertyItem.definition.type !== 'object') {
            const oldDef = parentPropertyItem.definition;
            const newParentSchemaDefinition: JSONSchema7 = {
              type: 'object',
              properties: {},
              ...(oldDef.title && { title: oldDef.title }),
              ...(oldDef.description && { description: oldDef.description }),
              ...(oldDef.$comment && { $comment: oldDef.$comment }),
            };
            parentPropertyItem.definition = {
              ...newParentSchemaDefinition,
              propertyList: [] as PropertyListItem[],
            } as JSONSchema7;
          }

          const currentParentDefinition = parentPropertyItem.definition as JSONSchema7 & {
            propertyList: PropertyListItem[];
          };

          currentParentDefinition.propertyList = currentParentDefinition.propertyList || [];
          targetParentPropertyDefinitionList = currentParentDefinition.propertyList;
        }

        if (targetParentPropertyDefinitionList.some((p) => p.keyName === newKeyName)) {
          console.warn(`Property "${newKeyName}" already exists in "${parentPathArray.join('.')}".`);

          return;
        }

        const newItemToAdd: PropertyListItem = {
          id: propertyId,
          keyName: newKeyName,
          definition: propertyDefinition,
          isRequired: propertyIsRequired,
        };

        targetParentPropertyDefinitionList.push(newItemToAdd);
        (setValue as any)('propertyList', currentRootPropertyList as any, {
          shouldValidate: false,
          shouldDirty: true,
          shouldTouch: true,
        });
      }
    },
    [append, getValues, setValue]
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
    setValue: (name: SchemaFormPath, value: any): void => {
      (methods.setValue as any)(name as any, value);
    },
    methods,
  };
}
