import { JSONSchemaDto } from '../../dto';

/**
 * Generates a payload based solely on the schema.
 * Supports nested schemas and applies defaults where defined.
 * @param JSONSchemaDto - Defining the structure. example:
 *  {
 *    type: 'object',
 *    properties: {
 *      payload: {
 *        firstName: { type: 'string', default: 'John' },
 *        lastName: { type: 'string' }
 *      }
 *    }
 *  }
 * @returns - Generated payload. example: { payload: { firstName: 'John', lastName: '{{payload.lastName}}' }}
 */
export function createMockObjectFromSchema(
  schema: JSONSchemaDto,
  path = '',
  depth = 0,
  safe = true
): Record<string, unknown> {
  const MAX_DEPTH = 10;
  if (depth >= MAX_DEPTH) {
    if (safe) {
      return {};
    }
    throw new Error(
      `Schema has surpassed the maximum allowed depth. Please specify a more shallow payload schema. Max depth: ${MAX_DEPTH}`
    );
  }

  if (schema?.type !== 'object' || !schema?.properties) {
    if (safe) {
      return {};
    }
    throw new Error('Schema must define an object with properties.');
  }

  return Object.entries(schema.properties).reduce((acc, [key, definition]) => {
    if (typeof definition === 'boolean') {
      return acc;
    }

    const currentPath = path && path.length > 0 ? `${path}.${key}` : key;

    if (definition.type === 'array' && definition.items) {
      // handle array type by creating a mock object for the first item
      acc[key] = [
        createMockObjectFromSchema(
          {
            type: 'object',
            properties:
              typeof definition.items === 'object' && 'properties' in definition.items
                ? definition.items.properties
                : {},
          },
          `${currentPath}.0`,
          depth + 1
        ),
      ];
    } else if (definition.default) {
      acc[key] = definition.default;
    } else if (definition.type === 'object' && definition.properties) {
      acc[key] = createMockObjectFromSchema(definition, currentPath, depth + 1);
    } else {
      acc[key] = `{{${currentPath}}}`;
    }

    return acc;
  }, {});
}
