import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useCallback, useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { MAX_NESTING_DEPTH } from './constants';
import type { JSONSchema7, JSONSchema7TypeName } from './json-schema';
import type { SchemaFormPath, UseSchemaFormProps, UseSchemaFormReturn } from './types';
import {
  convertPropertyListToSchema,
  convertSchemaToPropertyList,
  createPropertyItem,
  editorSchema,
  findOrCreatePropertyPath,
  type PropertyData,
  type PropertyListItem,
  parsePropertyPath,
  propertyExists,
  type SchemaEditorFormValues,
} from './utils';

const defaultFormValues: SchemaEditorFormValues = {
  propertyList: [],
};

const DEBOUNCE_DELAY = 300;

export function useSchemaForm({ initialSchema, onChange, onValidityChange }: UseSchemaFormProps): UseSchemaFormReturn {
  const initialTransformedValues: SchemaEditorFormValues = {
    propertyList: initialSchema?.properties
      ? convertSchemaToPropertyList(initialSchema.properties, initialSchema.required)
      : defaultFormValues.propertyList,
  };

  const methods = useForm<SchemaEditorFormValues>({
    defaultValues: initialTransformedValues,
    resolver: standardSchemaResolver(editorSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  const { control, watch, formState, getValues, setValue } = methods;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'propertyList',
    keyName: 'fieldId',
  });

  // Sync form validity state
  useEffect(() => {
    onValidityChange?.(formState.isValid);
  }, [formState.isValid, onValidityChange]);

  // Watch for changes and sync with parent
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;

    const subscription = watch((value) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (onChange && value.propertyList) {
          const outputSchema = createSchemaFromPropertyList(value.propertyList as PropertyListItem[]);
          onChange(outputSchema);
        }
      }, DEBOUNCE_DELAY);
    });

    return () => {
      clearTimeout(debounceTimer);
      subscription.unsubscribe();
    };
  }, [watch, onChange]);

  const addProperty = useCallback(
    (propertyDataFromArg?: Partial<PropertyListItem>, typeFromArg?: JSONSchema7TypeName) => {
      const defaultType = typeFromArg || 'string';

      // Handle root level property addition
      if (!propertyDataFromArg?.keyName) {
        appendRootProperty(propertyDataFromArg, defaultType, append);
        return;
      }

      // Handle nested property addition
      const pathInfo = parsePropertyPath(propertyDataFromArg.keyName);

      if (!pathInfo) {
        return;
      }

      // Check nesting depth
      if (pathInfo.parentPath.length >= MAX_NESTING_DEPTH) {
        console.warn(
          `Cannot add property at depth ${pathInfo.parentPath.length + 1}. Maximum nesting depth is ${MAX_NESTING_DEPTH}.`
        );
        return;
      }

      if (pathInfo.parentPath.length === 0) {
        // Add to root level
        addRootLevelProperty(propertyDataFromArg, defaultType, pathInfo.keyName, getValues, append);
      } else {
        // Add to nested level
        addNestedProperty(propertyDataFromArg, defaultType, pathInfo, getValues, setValue);
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
    return createSchemaFromPropertyList(propertyList);
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
      methods.setValue(name, value);
    },
    methods,
  };
}

// Helper functions
function createSchemaFromPropertyList(propertyList: PropertyListItem[]): JSONSchema7 {
  const { properties, required } = convertPropertyListToSchema(propertyList);

  return {
    type: 'object',
    properties,
    ...(required && required.length > 0 ? { required } : {}),
  };
}

function appendRootProperty(
  propertyData: PropertyData | undefined,
  defaultType: JSONSchema7TypeName,
  append: any
): void {
  const newProperty = createPropertyItem(propertyData || {}, defaultType);
  append(newProperty);
}

function addRootLevelProperty(
  propertyData: PropertyData,
  defaultType: JSONSchema7TypeName,
  keyName: string,
  getValues: () => SchemaEditorFormValues,
  append: any
): void {
  const currentRootPropertyList = getValues().propertyList || [];

  if (propertyExists(currentRootPropertyList, keyName)) {
    console.warn(`Property "${keyName}" already exists at the root level.`);
    return;
  }

  const newProperty = createPropertyItem({ ...propertyData, keyName }, defaultType);
  append(newProperty);
}

function addNestedProperty(
  propertyData: PropertyData,
  defaultType: JSONSchema7TypeName,
  pathInfo: ReturnType<typeof parsePropertyPath>,
  getValues: () => SchemaEditorFormValues,
  setValue: any
): void {
  if (!pathInfo) {
    return;
  }

  const currentRootPropertyList: PropertyListItem[] = JSON.parse(JSON.stringify(getValues().propertyList || []));

  try {
    const targetList = findOrCreatePropertyPath(currentRootPropertyList, pathInfo.parentPath);

    if (propertyExists(targetList, pathInfo.keyName)) {
      console.warn(`Property "${pathInfo.keyName}" already exists in "${pathInfo.parentPath.join('.')}".`);
      return;
    }

    const newProperty = createPropertyItem({ ...propertyData, keyName: pathInfo.keyName }, defaultType);

    targetList.push(newProperty);

    setValue('propertyList', currentRootPropertyList, {
      shouldValidate: false,
      shouldDirty: true,
      shouldTouch: true,
    });
  } catch (error) {
    console.error(`Failed to add nested property: ${error instanceof Error ? error.message : String(error)}`);
  }
}
