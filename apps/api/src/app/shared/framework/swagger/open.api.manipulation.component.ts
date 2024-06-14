import Nimma from 'nimma';
import { OpenAPIObject } from '@nestjs/swagger';

const jpath = '$.paths..responses["200","201"].content["application/json"]';

/**
 * @param {import("nimma").EmittedScope} scope
 */
function liftDataProperty(scope) {
  if (
    typeof scope.value !== 'object' ||
    !scope.value ||
    !('schema' in scope.value) ||
    typeof scope.value.schema !== 'object' ||
    !scope.value.schema
  ) {
    return;
  }

  const schema = scope.value.schema;
  const data =
    'properties' in schema &&
    typeof schema.properties === 'object' &&
    schema.properties &&
    'data' in schema.properties &&
    typeof schema.properties.data === 'object'
      ? schema.properties.data
      : null;
  if (!data) {
    return;
  }

  scope.value.schema = data;
}
export function removeEndpointsWithoutApiKey<T>(openApiDocument: T): T {
  const parsedDocument = JSON.parse(JSON.stringify(openApiDocument));

  if (!parsedDocument.paths) {
    throw new Error('Invalid OpenAPI document');
  }

  for (const path in parsedDocument.paths) {
    const operations = parsedDocument.paths[path];
    for (const method in operations) {
      const operation = operations[method];
      if (operation.security) {
        const hasApiKey = operation.security.some((sec: { [key: string]: string[] }) =>
          Object.keys(sec).includes('api-key')
        );
        operation.security = operation.security.filter((sec: { [key: string]: string[] }) =>
          Object.keys(sec).includes('api-key')
        );
        if (!hasApiKey) {
          delete operations[method];
        }
      }
    }
    if (Object.keys(operations).length === 0) {
      delete parsedDocument.paths[path];
    }
  }

  return parsedDocument;
}
export function transformDocument(inputDocument: OpenAPIObject) {
  Nimma.query(inputDocument, {
    [jpath]: liftDataProperty,
  });

  return removeEndpointsWithoutApiKey(inputDocument) as OpenAPIObject;
}
