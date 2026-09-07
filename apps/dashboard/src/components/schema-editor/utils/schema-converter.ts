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
    let isNullable = false;

    // Detect nullable: check if type is an array containing 'null'
    if (Array.isArray(definition.type) && definition.type.includes('null')) {
      isNullable = true;
      // Extract the non-null type as the primary type
      const nonNullTypes = definition.type.filter((t) => t !== 'null');
      if (nonNullTypes.length === 1) {
        definitionForListItem.type = nonNullTypes[0] as any;
      } else if (nonNullTypes.length > 1) {
        definitionForListItem.type = nonNullTypes as any;
      }
    }

    // Handle object types with properties (check normalized type)
    if (definitionForListItem.type === 'object' && definition.properties) {
      nestedPropertyList = convertSchemaToPropertyList(definition.properties, definition.required);
      delete definitionForListItem.properties;
    }

    // Handle array types with object items that have properties (check normalized type)
    if (definitionForListItem.type === 'array' && definition.items) {
      const items = definition.items as JSONSchema7;

      // Normalize item type if it's nullable
      let itemType = items.type;
      if (Array.isArray(items.type) && items.type.includes('null')) {
        const nonNullTypes = items.type.filter((t) => t !== 'null');
        if (nonNullTypes.length > 0) {
          itemType = nonNullTypes[0];
        }
      }

      if (itemType === 'object' && items.properties) {
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
      isNullable,
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

    const currentDefinition = processPropertyDefinition(item.definition, item.isNullable);

    if (item.isRequired) {
      required.push(item.keyName);
    }

    properties[item.keyName] = currentDefinition;
  });

  return { properties, ...(required.length > 0 ? { required } : {}) };
}

function processPropertyDefinition(definition: JSONSchema7, isNullable?: boolean): JSONSchema7 {
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

  // Handle nullable: convert type to array with null
  if (isNullable && currentDefinition.type && currentDefinition.type !== 'null') {
    if (typeof currentDefinition.type === 'string') {
      currentDefinition.type = [currentDefinition.type, 'null'] as any;
    } else if (Array.isArray(currentDefinition.type) && !currentDefinition.type.includes('null')) {
      currentDefinition.type = [...currentDefinition.type, 'null'] as any;
    }
  }

  delete (currentDefinition as any).propertyList;

  return currentDefinition;
}

function processArrayItems(items: JSONSchema7): JSONSchema7 {
  const itemsWithList = items as JSONSchema7 & { propertyList?: PropertyListItem[] };

  if (isObjectWithPropertyList(itemsWithList)) {
    const itemsConversion = convertPropertyListToSchema(itemsWithList.propertyList);
    const { propertyList: _propertyList, ...itemsWithoutPropertyList } = itemsWithList;

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
