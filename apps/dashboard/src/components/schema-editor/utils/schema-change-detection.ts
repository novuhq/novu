import type { JSONSchema7, JSONSchema7TypeName } from '../json-schema';
import type { VariableUsageInfo } from './check-variable-usage';

export interface SchemaChange {
  type: 'deleted' | 'added' | 'typeChanged' | 'requiredChanged';
  originalKey?: string;
  newKey?: string;
  originalType?: JSONSchema7TypeName;
  newType?: JSONSchema7TypeName;
  originalRequired?: boolean;
  newRequired?: boolean;
  usageInfo: VariableUsageInfo;
}

export interface SchemaChanges {
  deleted: SchemaChange[];
  added: SchemaChange[];
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

  const type = property.type;

  // Handle type arrays (nullable properties with type like ["string", "null"])
  // Extract the non-null type for comparison to avoid false positives
  if (Array.isArray(type)) {
    const nonNullTypes = type.filter((t) => t !== 'null');
    if (nonNullTypes.length > 0) {
      return nonNullTypes[0] as JSONSchema7TypeName;
    }
  }

  return type as JSONSchema7TypeName;
}

export function detectSchemaChanges(
  originalSchema: JSONSchema7,
  newSchema: JSONSchema7,
  checkVariableUsage: (key: string) => VariableUsageInfo
): SchemaChanges {
  const changes: SchemaChanges = {
    deleted: [],
    added: [],
    typeChanged: [],
    requiredChanged: [],
    hasUsedVariableChanges: false,
  };

  const originalProperties = getSchemaProperties(originalSchema);
  const newProperties = getSchemaProperties(newSchema);
  const originalRequired = getSchemaRequired(originalSchema);
  const newRequired = getSchemaRequired(newSchema);

  // Get all unique keys from both schemas
  const allKeys = new Set([...Object.keys(originalProperties), ...Object.keys(newProperties)]);

  for (const key of allKeys) {
    const originalProperty = originalProperties[key];
    const newProperty = newProperties[key];
    const usageInfo = checkVariableUsage(key);

    if (originalProperty && !newProperty) {
      // Property was deleted
      changes.deleted.push({
        type: 'deleted',
        originalKey: key,
        usageInfo,
      });

      if (usageInfo.isUsed) {
        changes.hasUsedVariableChanges = true;
      }
    } else if (!originalProperty && newProperty) {
      // Property was added
      changes.added.push({
        type: 'added',
        newKey: key,
        usageInfo,
      });

      if (usageInfo.isUsed) {
        changes.hasUsedVariableChanges = true;
      }
    } else if (originalProperty && newProperty) {
      // Property exists in both - check for changes
      const originalType = getPropertyType(originalProperty);
      const newType = getPropertyType(newProperty);

      // Check for type changes
      if (originalType !== newType) {
        changes.typeChanged.push({
          type: 'typeChanged',
          originalKey: key,
          newKey: key,
          originalType,
          newType,
          usageInfo,
        });

        if (usageInfo.isUsed) {
          changes.hasUsedVariableChanges = true;
        }
      }

      // Check for required status changes
      const wasRequired = originalRequired.includes(key);
      const isRequired = newRequired.includes(key);

      if (wasRequired !== isRequired) {
        changes.requiredChanged.push({
          type: 'requiredChanged',
          originalKey: key,
          newKey: key,
          originalRequired: wasRequired,
          newRequired: isRequired,
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

  if (changes.added.length > 0) {
    parts.push(`${changes.added.length} added`);
  }

  if (changes.typeChanged.length > 0) {
    parts.push(`${changes.typeChanged.length} type changed`);
  }

  if (changes.requiredChanged.length > 0) {
    parts.push(`${changes.requiredChanged.length} required status changed`);
  }

  return parts.join(', ');
}
