import Ajv, { type AnySchema } from 'ajv';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

const DRAFT_2020_12_SCHEMA_ID = 'https://json-schema.org/draft/2020-12/schema';

function usesDraft2020Schema(schema: AnySchema): boolean {
  if (typeof schema !== 'object' || schema === null || !('$schema' in schema)) {
    return false;
  }

  const schemaId = (schema as { $schema?: string }).$schema;

  return schemaId === DRAFT_2020_12_SCHEMA_ID || schemaId?.includes('2020-12') === true;
}

export function createAjvInstance(schema: AnySchema): Ajv {
  const ajv = usesDraft2020Schema(schema)
    ? new Ajv2020({ allErrors: true, strict: false })
    : new Ajv({ allErrors: true, strict: false });

  addFormats(ajv);

  return ajv;
}
