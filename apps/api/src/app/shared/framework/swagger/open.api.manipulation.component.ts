import { OpenAPIObject, OperationObject, PathItemObject, PathsObject } from '@nestjs/swagger';
import { API_KEY_SWAGGER_SECURITY_NAME } from '@novu/application-generic';
import Nimma from 'nimma';

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
  if (isForInternalSdk) {
    return inputDocument;
  } else {
    return removeEndpointsWithoutApiKey(inputDocument) as OpenAPIObject;
  }
}

/**
 * @nestjs/swagger wraps a `$ref` that has sibling keywords (description, default...) in `allOf`.
 * Speakeasy turns an `allOf`-wrapped enum into a new inline enum named after the property,
 * so the SDK would lose the shared enum types (e.g. `UiComponentEnum`). Reference enums directly.
 *
 * Speakeasy ignores keywords next to a `$ref`, so a property `default` is moved onto the enum
 * schema when every reference to that enum uses the same default (e.g. `__source`).
 */
function unwrapEnumReferences(inputDocument: OpenAPIObject) {
  const schemas = inputDocument.components?.schemas ?? {};
  const getEnumSchema = (ref: string) => {
    const schema = schemas[ref.replace('#/components/schemas/', '')];

    return schema && 'enum' in schema ? schema : undefined;
  };
  const defaultsByRef = new Map<string, unknown[]>();

  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') {
      return;
    }

    const schema = node as Record<string, unknown>;
    const { allOf } = schema;
    const wrappedRef = Array.isArray(allOf) && allOf.length === 1 ? allOf[0]?.$ref : undefined;
    const ref = typeof wrappedRef === 'string' ? wrappedRef : schema.$ref;
    if (typeof ref === 'string' && getEnumSchema(ref)) {
      if (ref === wrappedRef) {
        schema.$ref = ref;
        delete schema.allOf;
      }
      defaultsByRef.set(ref, [...(defaultsByRef.get(ref) ?? []), schema.default]);
    }

    for (const child of Object.values(schema)) {
      visit(child);
    }
  };

  visit(inputDocument);

  for (const [ref, defaults] of defaultsByRef) {
    const enumSchema = getEnumSchema(ref);
    const [firstDefault] = defaults;
    if (enumSchema && firstDefault !== undefined && defaults.every((value) => value === firstDefault)) {
      enumSchema.default = firstDefault;
    }
  }
}

export function overloadDocumentForSdkGeneration(inputDocument: OpenAPIObject, isForInternalSdk: boolean = false) {
  unwrapDataAttribute(inputDocument);
  const openAPIObject = filterBearerOnlyIfExternal(isForInternalSdk, inputDocument);
  const sdkDocument = addIdempotencyKeyHeader(openAPIObject) as OpenAPIObject;
  unwrapEnumReferences(sdkDocument);

  return sdkDocument;
}

function addIdempotencyKeyHeader<T>(openApiDocument: T): T {
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
export function sortOpenAPIDocument(openApiDoc: OpenAPIObject): OpenAPIObject {
  // Create a deep copy of the original document
  const sortedDoc: OpenAPIObject = JSON.parse(JSON.stringify(openApiDoc));

  // Remove empty tag references
  if (sortedDoc.tags) {
    sortedDoc.tags = sortedDoc.tags.filter((tag) => tag.name && tag.name.trim() !== '');
  }

  // Sort paths
  if (sortedDoc.paths) {
    const sortedPaths: PathsObject = {};

    // Sort path keys based on version (v2 before v1) and then alphabetically
    const sortedPathKeys = Object.keys(sortedDoc.paths).sort((a, b) => {
      // Extract version from path
      const getVersion = (path: string) => {
        const versionMatch = path.match(/\/v(\d+)/);

        return versionMatch ? parseInt(versionMatch[1], 10) : 0;
      };

      const versionA = getVersion(a);
      const versionB = getVersion(b);

      // Sort by version (newer first)
      if (versionA !== versionB) {
        return versionB - versionA;
      }

      // If versions are the same, sort alphabetically
      return a.localeCompare(b);
    });

    // Reconstruct paths with sorted keys and sorted methods within each path
    for (const pathKey of sortedPathKeys) {
      const pathItem = sortedDoc.paths[pathKey];

      // Define method order priority
      const methodPriority = ['post', 'put', 'patch', 'get', 'delete', 'options', 'head', 'trace'];

      // Sort methods within the path item
      sortedPaths[pathKey] = {
        ...pathItem,
        ...Object.fromEntries(
          methodPriority
            .map((method) => {
              const operation = pathItem[method as keyof PathItemObject];

              return operation ? [method, operation] : null;
            })
            .filter((entry): entry is [string, OperationObject] => entry !== null)
            .sort((a, b) => {
              const opIdA = a[1].operationId || '';
              const opIdB = b[1].operationId || '';

              return opIdA.localeCompare(opIdB);
            })
        ),
      };
    }

    sortedDoc.paths = sortedPaths;
  }

  return sortedDoc;
}
