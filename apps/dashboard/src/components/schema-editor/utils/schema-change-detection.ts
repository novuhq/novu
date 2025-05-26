import type { JSONSchema7, JSONSchema7TypeName } from '../json-schema';
import type { VariableUsageInfo } from './check-variable-usage';

export interface SchemaChange {
  type: 'deleted' | 'renamed' | 'typeChanged' | 'requiredChanged';
  originalKey: string;
  newKey?: string;
  originalType?: JSONSchema7TypeName;
  newType?: JSONSchema7TypeName;
  originalRequired?: boolean;
  newRequired?: boolean;
  usageInfo: VariableUsageInfo;
}

export interface SchemaChanges {
  deleted: SchemaChange[];
  renamed: SchemaChange[];
  typeChanged: SchemaChange[];
  requiredChanged: SchemaChange[];
  hasUsedVariableChanges: boolean;
}

function getSchemaProperties(schema?: JSONSchema7): Record<string, JSONSchema7> {
  if (!schema || typeof schema === 'boolean' || !schema.properties) {
    return {};
  }

  return schema.properties as Record<string, JSONSchema7>;
}

function getSchemaRequired(schema?: JSONSchema7): string[] {
  if (!schema || typeof schema === 'boolean') {
    return [];
  }

  return schema.required || [];
}

function getPropertyType(property: JSONSchema7): JSONSchema7TypeName | undefined {
  if (typeof property === 'boolean') return undefined;
  return property.type as JSONSchema7TypeName;
}

function arePropertiesEqual(prop1: JSONSchema7, prop2: JSONSchema7): boolean {
  if (typeof prop1 === 'boolean' || typeof prop2 === 'boolean') {
    return prop1 === prop2;
  }

  return (
    prop1.type === prop2.type &&
    prop1.title === prop2.title &&
    prop1.description === prop2.description &&
    prop1.format === prop2.format
  );
}

function findRenamedProperty(
  targetProperty: JSONSchema7,
  candidates: Array<{ key: string; property: JSONSchema7 }>
): { key: string; property: JSONSchema7 } | null {
  return candidates.find((candidate) => arePropertiesEqual(targetProperty, candidate.property)) || null;
}

export function detectSchemaChanges(
  originalSchema: JSONSchema7,
  newSchema: JSONSchema7,
  checkVariableUsage: (key: string) => VariableUsageInfo
): SchemaChanges {
  const changes: SchemaChanges = {
    deleted: [],
    renamed: [],
    typeChanged: [],
    requiredChanged: [],
    hasUsedVariableChanges: false,
  };

  const originalProperties = getSchemaProperties(originalSchema);
  const newProperties = getSchemaProperties(newSchema);
  const originalRequired = getSchemaRequired(originalSchema);
  const newRequired = getSchemaRequired(newSchema);

  const processedNewKeys = new Set<string>();

  // Check for deleted and type/required changes
  for (const [originalKey, originalProperty] of Object.entries(originalProperties)) {
    const usageInfo = checkVariableUsage(originalKey);

    if (newProperties[originalKey]) {
      // Property still exists with same key
      const newProperty = newProperties[originalKey];
      processedNewKeys.add(originalKey);

      // Check for type changes
      const originalType = getPropertyType(originalProperty);
      const newType = getPropertyType(newProperty);

      if (originalType !== newType) {
        changes.typeChanged.push({
          type: 'typeChanged',
          originalKey,
          originalType,
          newType,
          usageInfo,
        });

        if (usageInfo.isUsed) {
          changes.hasUsedVariableChanges = true;
        }
      }

      // Check for required status changes
      const wasRequired = originalRequired.includes(originalKey);
      const isRequired = newRequired.includes(originalKey);

      if (wasRequired !== isRequired) {
        changes.requiredChanged.push({
          type: 'requiredChanged',
          originalKey,
          originalRequired: wasRequired,
          newRequired: isRequired,
          usageInfo,
        });

        if (usageInfo.isUsed) {
          changes.hasUsedVariableChanges = true;
        }
      }
    } else {
      // Property doesn't exist with same key - could be deleted or renamed
      const remainingNewProperties = Object.entries(newProperties)
        .filter(([key]) => !processedNewKeys.has(key))
        .map(([key, property]) => ({ key, property }));

      const renamedMatch = findRenamedProperty(originalProperty, remainingNewProperties);

      if (renamedMatch) {
        // Property was renamed
        processedNewKeys.add(renamedMatch.key);
        changes.renamed.push({
          type: 'renamed',
          originalKey,
          newKey: renamedMatch.key,
          usageInfo,
        });

        if (usageInfo.isUsed) {
          changes.hasUsedVariableChanges = true;
        }

        // Check for required status changes in renamed property
        const wasRequired = originalRequired.includes(originalKey);
        const isRequired = newRequired.includes(renamedMatch.key);

        if (wasRequired !== isRequired) {
          changes.requiredChanged.push({
            type: 'requiredChanged',
            originalKey,
            newKey: renamedMatch.key,
            originalRequired: wasRequired,
            newRequired: isRequired,
            usageInfo,
          });
        }
      } else {
        // Property was deleted
        changes.deleted.push({
          type: 'deleted',
          originalKey,
          usageInfo,
        });

        if (usageInfo.isUsed) {
          changes.hasUsedVariableChanges = true;
        }
      }
    }
  }

  return changes;
}

export function getChangesSummary(changes: SchemaChanges): string {
  const parts: string[] = [];

  if (changes.deleted.length > 0) {
    parts.push(`${changes.deleted.length} deleted`);
  }

  if (changes.renamed.length > 0) {
    parts.push(`${changes.renamed.length} renamed`);
  }

  if (changes.typeChanged.length > 0) {
    parts.push(`${changes.typeChanged.length} type changed`);
  }

  if (changes.requiredChanged.length > 0) {
    parts.push(`${changes.requiredChanged.length} required status changed`);
  }

  return parts.join(', ');
}
