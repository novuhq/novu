import { useMemo } from 'react';
import type { JSONSchema7, JSONSchema7TypeName } from '../json-schema';

/**
 * Custom hook to determine the effective display type of a JSON schema definition.
 * It prioritizes 'enum' if an enum array exists, otherwise returns the defined 'type'.
 * This is primarily for UI components like type selectors or row displays to decide
 * what kind of schema it is for rendering its specific controls.
 */
export function useSchemaPropertyType(definition?: JSONSchema7): JSONSchema7TypeName | 'enum' | undefined {
  return useMemo(() => {
    if (!definition) {
      return undefined;
    }

    // If an enum array is present (even empty), it's considered an enum type for UI purposes.
    // The actual validation for enum choices would ensure it's not empty if it's required to have values.
    if (Array.isArray(definition.enum)) {
      return 'enum';
    }

    const type = definition.type;

    // Handle type arrays (e.g., ["object", "null"] for nullable properties)
    // Extract the non-null type for UI rendering
    if (Array.isArray(type)) {
      const nonNullTypes = type.filter((t) => t !== 'null');
      if (nonNullTypes.length > 0) {
        return nonNullTypes[0] as JSONSchema7TypeName;
      }
    }

    return type as JSONSchema7TypeName | undefined;
  }, [definition]);
}
