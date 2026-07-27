/**
 * JSON Schema pointer resolution and instance-path reachability — used to decide whether an AJV
 * error anchored in a shared `$ref` definition is reachable from a winning branch.
 */

export type SchemaNodeLike = Record<string, unknown>;

export function isSchemaObject(value: unknown): value is SchemaNodeLike {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodePointerSegment(rawSegment: string): string {
  return rawSegment.replace(/~1/g, '/').replace(/~0/g, '~');
}

/** AJV percent-encodes special characters in schema paths (`Record%3Cstring%2Cunknown%3E`). */
function tryDecodeUriComponent(segment: string): string | undefined {
  try {
    return decodeURIComponent(segment);
  } catch {
    return undefined;
  }
}

export function resolveSchemaPointer(root: SchemaNodeLike, pointer: string): unknown {
  if (pointer === '#') {
    return root;
  }

  if (!pointer.startsWith('#/')) {
    return undefined;
  }

  let node: unknown = root;

  for (const rawSegment of pointer.slice(2).split('/')) {
    if (node === null || typeof node !== 'object') {
      return undefined;
    }

    const segment = decodePointerSegment(rawSegment);

    if (Array.isArray(node)) {
      node = node[Number(segment)];
    } else {
      const container = node as Record<string, unknown>;

      if (segment in container) {
        node = container[segment];
      } else {
        const decoded = tryDecodeUriComponent(segment);
        node = decoded !== undefined && decoded in container ? container[decoded] : undefined;
      }
    }
  }

  return node;
}

/**
 * Adds `node` plus everything it stands for to `out`: `$ref` targets and every composition
 * branch, since AJV anchors an error on whichever of those it was checking. Returns false when a
 * `$ref` does not resolve — the walk can then prove nothing and the caller must keep the error.
 */
function expandSchemaNode(root: SchemaNodeLike, node: unknown, out: Set<SchemaNodeLike>): boolean {
  if (!isSchemaObject(node) || out.has(node)) {
    return true;
  }

  out.add(node);

  if (typeof node.$ref === 'string') {
    const target = resolveSchemaPointer(root, node.$ref);
    if (target === undefined || !expandSchemaNode(root, target, out)) {
      return false;
    }
  }

  for (const keyword of ['anyOf', 'oneOf', 'allOf'] as const) {
    const branches = node[keyword];
    if (Array.isArray(branches)) {
      for (const branch of branches) {
        if (!expandSchemaNode(root, branch, out)) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Keywords that attach subschemas this walk does not follow. A node carrying one could describe
 * the child instance in a way the walk cannot see, so descending past it would risk declaring a
 * genuine error unreachable.
 */
const UNMODELED_CHILD_KEYWORDS = [
  'patternProperties',
  'propertyNames',
  'dependencies',
  'dependentSchemas',
  'if',
  'then',
  'else',
  'not',
  'contains',
] as const;

function childSchemasFor(node: SchemaNodeLike, segment: string): { children: unknown[]; provable: boolean } {
  if (UNMODELED_CHILD_KEYWORDS.some((keyword) => keyword in node)) {
    return { children: [], provable: false };
  }

  const children: unknown[] = [];
  const { properties } = node;

  if (isSchemaObject(properties) && segment in properties) {
    children.push(properties[segment]);
  } else if (isSchemaObject(node.additionalProperties)) {
    children.push(node.additionalProperties);
  }

  if (/^\d+$/.test(segment)) {
    const { items } = node;
    if (Array.isArray(items)) {
      const positional = items[Number(segment)] ?? node.additionalItems;
      if (positional !== undefined) {
        children.push(positional);
      }
    } else if (items !== undefined) {
      children.push(items);
    }
  }

  return { children, provable: true };
}

/**
 * Every schema node that can describe the value `segments` below `branchSchema`. `undefined`
 * means the walk met something it cannot model and proves nothing; an empty set means the branch
 * provably says nothing about that location.
 */
export function reachableSchemaNodes(
  root: SchemaNodeLike,
  branchSchema: SchemaNodeLike,
  segments: readonly string[]
): Set<SchemaNodeLike> | undefined {
  let current = new Set<SchemaNodeLike>();

  if (!expandSchemaNode(root, branchSchema, current)) {
    return undefined;
  }

  for (const segment of segments) {
    const next = new Set<SchemaNodeLike>();

    for (const node of current) {
      const { children, provable } = childSchemasFor(node, segment);
      if (!provable) {
        return undefined;
      }

      for (const child of children) {
        if (!expandSchemaNode(root, child, next)) {
          return undefined;
        }
      }
    }

    current = next;

    if (current.size === 0) {
      return current;
    }
  }

  return current;
}

export function instanceSegmentsBetween(nodeInstancePath: string, errorInstancePath: string): string[] {
  if (errorInstancePath === nodeInstancePath) {
    return [];
  }

  return errorInstancePath
    .slice(nodeInstancePath.length + 1)
    .split('/')
    .map(decodePointerSegment);
}
