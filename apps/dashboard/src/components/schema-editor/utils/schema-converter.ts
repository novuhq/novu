import { v4 as uuidv4 } from 'uuid';
import type { JSONSchema7 } from '../json-schema';
import type { PropertyListItem } from './validation-schema';

export function convertSchemaToPropertyList(
  schemaProperties?: JSONSchema7['properties'],
  requiredArray?: string[]
): PropertyListItem[] {
  if (!schemaProperties) {
    return [];
  }

  return Object.entries(schemaProperties).map(([key, value]) => {
    const definition = value as JSONSchema7;
    const definitionForListItem: JSONSchema7 = { ...definition };
    let nestedPropertyList: PropertyListItem[] | undefined;

    // Handle object types with properties
    if (definition.type === 'object' && definition.properties) {
      nestedPropertyList = convertSchemaToPropertyList(definition.properties, definition.required);
      delete definitionForListItem.properties;
    }

    // Handle array types with object items that have properties
    if (isArrayWithObjectItems(definition)) {
      const items = definition.items as JSONSchema7;

      if (items.type === 'object' && items.properties) {
        const itemsPropertyList = convertSchemaToPropertyList(items.properties, items.required);
        definitionForListItem.items = {
          ...items,
          propertyList: itemsPropertyList,
        } as any;
        delete (definitionForListItem.items as any).properties;
        delete (definitionForListItem.items as any).required;
      }
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

export function convertPropertyListToSchema(propertyList?: PropertyListItem[]): {
  properties: JSONSchema7['properties'];
  required?: string[];
} {
  if (!propertyList || propertyList.length === 0) {
    return { properties: {} };
  }

  const properties: JSONSchema7['properties'] = {};
  const required: string[] = [];

  propertyList.forEach((item) => {
    if (item.keyName.trim() === '') {
      return;
    }

    const currentDefinition = processPropertyDefinition(item.definition);

    if (item.isRequired) {
      required.push(item.keyName);
    }

    properties[item.keyName] = currentDefinition;
  });

  return { properties, ...(required.length > 0 ? { required } : {}) };
}

function processPropertyDefinition(definition: JSONSchema7): JSONSchema7 {
  const currentDefinition = { ...definition };
  const definitionAsObjectWithList = currentDefinition as JSONSchema7 & { propertyList?: PropertyListItem[] };

  // Handle object types with propertyList
  if (isObjectWithPropertyList(definitionAsObjectWithList)) {
    const nestedConversion = convertPropertyListToSchema(definitionAsObjectWithList.propertyList);
    currentDefinition.properties = nestedConversion.properties;

    if (nestedConversion.required && nestedConversion.required.length > 0) {
      currentDefinition.required = nestedConversion.required;
    }
  } else if (currentDefinition.type === 'object' && !currentDefinition.properties) {
    currentDefinition.properties = {};
  }

  // Handle array types with object items that have propertyList
  if (isArrayWithObjectItems(currentDefinition)) {
    currentDefinition.items = processArrayItems(currentDefinition.items as JSONSchema7);
  }

  delete (currentDefinition as any).propertyList;

  return currentDefinition;
}

function processArrayItems(items: JSONSchema7): JSONSchema7 {
  const itemsWithList = items as JSONSchema7 & { propertyList?: PropertyListItem[] };

  if (isObjectWithPropertyList(itemsWithList)) {
    const itemsConversion = convertPropertyListToSchema(itemsWithList.propertyList);
    // Destructure to exclude propertyList from the spread
    const { propertyList, ...itemsWithoutPropertyList } = itemsWithList;

    return {
      ...itemsWithoutPropertyList,
      type: 'object',
      properties: itemsConversion.properties,
      ...(itemsConversion.required && itemsConversion.required.length > 0
        ? { required: itemsConversion.required }
        : {}),
    };
  }

  // Always remove propertyList from items, even if they don't match the object condition
  const cleanedItems = { ...items };
  delete (cleanedItems as any).propertyList;

  return cleanedItems;
}

// Type guards
function isArrayWithObjectItems(definition: JSONSchema7): boolean {
  return !!(
    definition.type === 'array' &&
    definition.items &&
    typeof definition.items === 'object' &&
    !Array.isArray(definition.items)
  );
}

function isObjectWithPropertyList(
  definition: JSONSchema7 & { propertyList?: PropertyListItem[] }
): definition is JSONSchema7 & { propertyList: PropertyListItem[] } {
  return !!(definition.type === 'object' && definition.propertyList && definition.propertyList.length > 0);
}
