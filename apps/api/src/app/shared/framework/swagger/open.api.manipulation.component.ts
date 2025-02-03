import Nimma from 'nimma';
import { OpenAPIObject } from '@nestjs/swagger';
import { API_KEY_SWAGGER_SECURITY_NAME } from '@novu/application-generic';

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

  const { schema } = scope.value;
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

  // eslint-disable-next-line no-param-reassign
  scope.value.schema = data;
}
export function removeEndpointsWithoutApiKey<T>(openApiDocument: T): T {
  const parsedDocument = JSON.parse(JSON.stringify(openApiDocument));

  if (!parsedDocument.paths) {
    throw new Error('Invalid OpenAPI document');
  }

  // eslint-disable-next-line guard-for-in
  for (const path in parsedDocument.paths) {
    const operations = parsedDocument.paths[path];
    // eslint-disable-next-line guard-for-in
    for (const method in operations) {
      const operation = operations[method];
      if (operation.security) {
        const hasApiKey = operation.security.some((sec: { [key: string]: string[] }) =>
          Object.keys(sec).includes(API_KEY_SWAGGER_SECURITY_NAME)
        );
        operation.security = operation.security.filter((sec: { [key: string]: string[] }) =>
          Object.keys(sec).includes(API_KEY_SWAGGER_SECURITY_NAME)
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

function unwrapDataAttribute(inputDocument: OpenAPIObject) {
  Nimma.query(inputDocument, {
    [jpath]: liftDataProperty,
  });
}

function filterBearerOnlyIfExternal(isForInternalSdk: boolean, inputDocument: OpenAPIObject) {
  let openAPIObject: OpenAPIObject;
  if (isForInternalSdk) {
    return inputDocument;
  } else {
    return removeEndpointsWithoutApiKey(inputDocument) as OpenAPIObject;
  }
}

export function overloadDocumentForSdkGeneration(inputDocument: OpenAPIObject, isForInternalSdk: boolean = false) {
  unwrapDataAttribute(inputDocument);
  const openAPIObject = filterBearerOnlyIfExternal(isForInternalSdk, inputDocument);

  return addIdempotencyKeyHeader(openAPIObject) as OpenAPIObject;
}
export function addIdempotencyKeyHeader<T>(openApiDocument: T): T {
  const parsedDocument = JSON.parse(JSON.stringify(openApiDocument));

  if (!parsedDocument.paths) {
    throw new Error('Invalid OpenAPI document');
  }

  const idempotencyKeyHeader = {
    name: 'idempotency-key',
    in: 'header',
    description: 'A header for idempotency purposes',
    required: false,
    schema: {
      type: 'string',
    },
  };

  const paths = Object.keys(parsedDocument.paths);
  for (const path of paths) {
    const operations = parsedDocument.paths[path];
    const methods = Object.keys(operations);
    for (const method of methods) {
      const operation = operations[method];

      if (!operation.parameters) {
        operation.parameters = [];
      }

      const hasIdempotencyKey = operation.parameters.some(
        (param) => param.name === 'Idempotency-Key' && param.in === 'header'
      );
      if (!hasIdempotencyKey) {
        operation.parameters.push(idempotencyKeyHeader);
      }
    }
  }

  return parsedDocument;
}
