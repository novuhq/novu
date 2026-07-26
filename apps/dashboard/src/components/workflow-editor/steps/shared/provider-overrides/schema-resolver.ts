import { type OverrideFieldSchema } from './override-field-schema';

/**
 * Property that discriminates `anyOf` branches. Slack's Block Kit unions all key off `type`
 * (`{ "type": "section" }`), which is what lets completion narrow to one block's fields.
 */
const DISCRIMINATOR_KEY = 'type';

const MAX_REF_HOPS = 20;

const MAX_BRANCH_DEPTH = 4;

const DISCRIMINATOR_HINT = 'Set the type first to unlock the rest of this object.';

/** Resolves `#/definitions/...` pointers. Segments are URI-encoded by the schema generator. */
function readPointer(root: OverrideFieldSchema, ref: string): OverrideFieldSchema | undefined {
  if (!ref.startsWith('#/')) {
    return undefined;
  }

  let node: unknown = root;

  for (const rawSegment of ref.slice(2).split('/')) {
    if (typeof node !== 'object' || node === null) {
      return undefined;
    }

    const segment = decodeURIComponent(rawSegment).replace(/~1/g, '/').replace(/~0/g, '~');
    node = (node as Record<string, unknown>)[segment];
  }

  if (typeof node !== 'object' || node === null || Array.isArray(node)) {
    return undefined;
  }

  return node as OverrideFieldSchema;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export type SchemaResolver = {
  rootSchema: OverrideFieldSchema;
  /** Follows `$ref` chains. Returns undefined when a pointer cannot be resolved. */
  deref: (fieldSchema: OverrideFieldSchema | undefined) => OverrideFieldSchema | undefined;
  /**
   * Narrows a node to the concrete object schema whose properties should be offered, picking the
   * `anyOf` branch that matches `discriminator` when one is known.
   */
  objectNode: (fieldSchema: OverrideFieldSchema | undefined, discriminator?: string) => OverrideFieldSchema | undefined;
  propertyNode: (objectNode: OverrideFieldSchema | undefined, key: string) => OverrideFieldSchema | undefined;
  itemsNode: (fieldSchema: OverrideFieldSchema | undefined) => OverrideFieldSchema | undefined;
  /** String literals accepted at a value position, gathered across `enum`, `const` and branches. */
  valueOptions: (fieldSchema: OverrideFieldSchema | undefined) => string[];
};

export function createSchemaResolver(rootSchema: OverrideFieldSchema): SchemaResolver {
  function deref(fieldSchema: OverrideFieldSchema | undefined): OverrideFieldSchema | undefined {
    let current = fieldSchema;

    for (let hop = 0; current?.$ref && hop < MAX_REF_HOPS; hop += 1) {
      current = readPointer(rootSchema, current.$ref);
    }

    if (current?.$ref) {
      return undefined;
    }

    return current;
  }

  /** String literals a node accepts, walking `const`, `enum` and nested branches. */
  function collectValues(fieldSchema: OverrideFieldSchema | undefined, depth: number): string[] {
    const resolved = deref(fieldSchema);
    if (!resolved || depth > MAX_BRANCH_DEPTH) {
      return [];
    }

    const values: string[] = [];

    if (typeof resolved.const === 'string') {
      values.push(resolved.const);
    }

    values.push(...(resolved.enum ?? []));

    for (const branch of resolved.anyOf ?? resolved.oneOf ?? []) {
      values.push(...collectValues(branch, depth + 1));
    }

    return values;
  }

  function mergeBranchProperties(branches: OverrideFieldSchema[]): OverrideFieldSchema {
    const properties: Record<string, OverrideFieldSchema> = {};

    for (const branch of branches) {
      for (const [key, propertySchema] of Object.entries(branch.properties ?? {})) {
        properties[key] ??= propertySchema;
      }
    }

    return { type: 'object', properties };
  }

  function objectNode(
    fieldSchema: OverrideFieldSchema | undefined,
    discriminator?: string
  ): OverrideFieldSchema | undefined {
    const resolved = deref(fieldSchema);
    if (!resolved) {
      return undefined;
    }

    const rawBranches = resolved.anyOf ?? resolved.oneOf;
    if (!rawBranches) {
      return resolved;
    }

    const objectBranches = rawBranches
      .map((branch) => deref(branch))
      .filter((branch): branch is OverrideFieldSchema => !!branch?.properties);

    if (objectBranches.length === 0) {
      return resolved;
    }

    if (discriminator) {
      const match = objectBranches.find((branch) =>
        collectValues(branch.properties?.[DISCRIMINATOR_KEY], 0).includes(discriminator)
      );

      if (match) {
        return match;
      }
    }

    if (objectBranches.length === 1) {
      return objectBranches[0];
    }

    const discriminatorValues = unique(
      objectBranches.flatMap((branch) => collectValues(branch.properties?.[DISCRIMINATOR_KEY], 0))
    );

    // With several candidate branches and no chosen type yet, offering every branch's fields would
    // be noise. Offer only the discriminator so the next keystroke narrows the union.
    if (discriminatorValues.length > 1) {
      return {
        type: 'object',
        properties: {
          [DISCRIMINATOR_KEY]: {
            type: 'string',
            enum: discriminatorValues,
            description: DISCRIMINATOR_HINT,
          },
        },
      };
    }

    return mergeBranchProperties(objectBranches);
  }

  function propertyNode(node: OverrideFieldSchema | undefined, key: string): OverrideFieldSchema | undefined {
    const direct = node?.properties?.[key];
    if (direct) {
      return direct;
    }

    const additional = node?.additionalProperties;

    return typeof additional === 'object' ? additional : undefined;
  }

  function itemsNode(fieldSchema: OverrideFieldSchema | undefined): OverrideFieldSchema | undefined {
    return deref(fieldSchema)?.items;
  }

  function valueOptions(fieldSchema: OverrideFieldSchema | undefined): string[] {
    return unique(collectValues(fieldSchema, 0));
  }

  return { rootSchema, deref, objectNode, propertyNode, itemsNode, valueOptions };
}
