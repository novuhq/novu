import { v4 as uuidv4 } from 'uuid';
import type { JSONSchema7, JSONSchema7TypeName } from '../json-schema';
import { newProperty } from './json-helpers';
import type { PropertyListItem } from './validation-schema';

export interface PropertyPath {
  segments: string[];
  keyName: string;
  parentPath: string[];
}

export interface PropertyData {
  id?: string;
  keyName?: string;
  definition?: JSONSchema7;
  isRequired?: boolean;
  isNullable?: boolean;
}

export function parsePropertyPath(fullPath: string): PropertyPath | null {
  if (!fullPath || fullPath.trim() === '') {
    return null;
  }

  const segments = fullPath.split('.');
  const keyName = segments[segments.length - 1];
  const parentPath = segments.slice(0, -1);

  if (keyName.trim() === '') {
    console.error('The final key name in the path cannot be empty.');
    return null;
  }

  return { segments, keyName, parentPath };
}

export function createPropertyItem(
  propertyData: PropertyData,
  defaultType: JSONSchema7TypeName = 'string'
): PropertyListItem {
  return {
    id: propertyData.id || uuidv4(),
    keyName: propertyData.keyName || '',
    definition: propertyData.definition || newProperty(defaultType),
    isRequired: propertyData.isRequired ?? false,
    isNullable: propertyData.isNullable ?? false,
  };
}

export function findOrCreatePropertyPath(propertyList: PropertyListItem[], pathSegments: string[]): PropertyListItem[] {
  let targetList = propertyList;

  for (const segment of pathSegments) {
    if (segment.trim() === '') {
      throw new Error(`Invalid empty segment in path`);
    }

    let parentItem = targetList.find((p) => p.keyName === segment);

    if (!parentItem) {
      parentItem = createObjectProperty(segment);
      targetList.push(parentItem);
    } else if (parentItem.definition.type !== 'object') {
      convertToObjectProperty(parentItem);
    }

    const parentDef = parentItem.definition as JSONSchema7 & { propertyList: PropertyListItem[] };
    parentDef.propertyList = parentDef.propertyList || [];
    targetList = parentDef.propertyList;
  }

  return targetList;
}

function createObjectProperty(keyName: string): PropertyListItem {
  return {
    id: uuidv4(),
    keyName,
    definition: {
      type: 'object',
      properties: {},
      propertyList: [],
    } as JSONSchema7 & { propertyList: PropertyListItem[] },
    isRequired: false,
    isNullable: false,
  };
}

function convertToObjectProperty(item: PropertyListItem): void {
  const oldDef = item.definition;
  const newDef: JSONSchema7 = {
    type: 'object',
    properties: {},
    ...(oldDef.title && { title: oldDef.title }),
    ...(oldDef.description && { description: oldDef.description }),
    ...(oldDef.$comment && { $comment: oldDef.$comment }),
  };

  item.definition = {
    ...newDef,
    propertyList: [],
  } as JSONSchema7 & { propertyList: PropertyListItem[] };
}

export function propertyExists(propertyList: PropertyListItem[], keyName: string): boolean {
  return propertyList.some((p) => p.keyName === keyName);
}
