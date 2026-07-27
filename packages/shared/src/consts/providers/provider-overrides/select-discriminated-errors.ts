/**
 * Narrows the error avalanche AJV produces for the liquid-tolerant schemas, whose `anyOf`
 * wrapping multiplies every failure by the number of branches that were tried.
 */

/** Structural subset of AJV's `ErrorObject`, so this package needs no AJV dependency. */
export type SchemaValidationErrorLike = {
  instancePath: string;
  schemaPath: string;
  keyword: string;
  message?: string;
};

type CompositionSegment = {
  /** Schema path up to and including the composition keyword, e.g. `#/properties/blocks/anyOf`. */
  site: string;
  branchIndex: string;
};

function compositionSegments(schemaPath: string): CompositionSegment[] {
  const pattern = /\/(anyOf|oneOf)\/(\d+)(?=\/|$)/g;
  const segments: CompositionSegment[] = [];

  let match = pattern.exec(schemaPath);
  while (match) {
    segments.push({
      site: `${schemaPath.slice(0, match.index)}/${match[1]}`,
      branchIndex: match[2] as string,
    });
    match = pattern.exec(schemaPath);
  }

  return segments;
}

/**
 * How many levels the schema path descends into the instance after the branch it belongs to,
 * so the composition node's own instance path can be recovered from a nested error.
 */
function instanceDepthOfSchemaSuffix(suffix: string): number {
  const tokens = suffix.split('/').filter(Boolean);
  let depth = 0;
  let index = 0;

  while (index < tokens.length) {
    const token = tokens[index] as string;

    if (token === 'properties' || token === 'patternProperties') {
      depth += 1;
      index += 2;
    } else if (token === 'anyOf' || token === 'oneOf' || token === 'allOf') {
      index += 2;
    } else if ((token === 'items' || token === 'additionalProperties') && index < tokens.length - 1) {
      depth += 1;
      index += 1;
    } else {
      index += 1;
    }
  }

  return depth;
}

function dropTrailingSegments(instancePath: string, count: number): string {
  if (count <= 0) {
    return instancePath;
  }

  const segments = instancePath.split('/');

  return segments.slice(0, Math.max(1, segments.length - count)).join('/');
}

function isInstancePathPrefix(prefix: string, path: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function isOnSameInstanceChain(a: string, b: string): boolean {
  return isInstancePathPrefix(a, b) || isInstancePathPrefix(b, a);
}

function resolveInstancePath(data: unknown, instancePath: string): unknown {
  if (instancePath === '') {
    return data;
  }

  return instancePath
    .slice(1)
    .split('/')
    .reduce<unknown>((current, rawSegment) => {
      if (current === null || typeof current !== 'object') {
        return undefined;
      }
      const segment = rawSegment.replace(/~1/g, '/').replace(/~0/g, '~');

      return (current as Record<string, unknown>)[segment];
    }, data);
}

function hasStringTypeField(value: unknown): boolean {
  return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string';
}

/** The `type` const/enum mismatch AJV reports on a branch the value was never meant for. */
function isDiscriminatorMismatch(error: SchemaValidationErrorLike, branchPrefix: string): boolean {
  if (error.keyword !== 'const' && error.keyword !== 'enum') {
    return false;
  }

  return error.schemaPath.startsWith(`${branchPrefix}/properties/type/`);
}

function isTypeDiscriminatorError(error: SchemaValidationErrorLike): boolean {
  return (error.keyword === 'const' || error.keyword === 'enum') && /\/properties\/type(?:\/|$)/.test(error.schemaPath);
}

type BranchGroup = {
  site: string;
  branchPrefix: string;
  nodeInstancePath: string;
  /** Raw: this branch's own `properties.type` const/enum failed. */
  hasDiscriminatorMismatch: boolean;
};

type DiscriminatedSite = {
  selectedBranchPrefix: string;
  nodeInstancePath: string;
  /** Sole matched branch is the liquid-tolerance `type: string` fallback. */
  selectedIsLiquid: boolean;
};

function groupBranches<TError extends SchemaValidationErrorLike>(errors: readonly TError[]): BranchGroup[] {
  const groups = new Map<string, BranchGroup>();

  for (const error of errors) {
    for (const { site, branchIndex } of compositionSegments(error.schemaPath)) {
      const branchPrefix = `${site}/${branchIndex}`;
      const suffix = error.schemaPath.slice(branchPrefix.length);
      const nodeInstancePath = dropTrailingSegments(error.instancePath, instanceDepthOfSchemaSuffix(suffix));
      const key = `${branchPrefix}\u0000${nodeInstancePath}`;
      const group = groups.get(key) ?? {
        site,
        branchPrefix,
        nodeInstancePath,
        hasDiscriminatorMismatch: false,
      };

      group.hasDiscriminatorMismatch ||= isDiscriminatorMismatch(error, branchPrefix);
      groups.set(key, group);
    }
  }

  return [...groups.values()];
}

function indexGroupsBySite(groups: readonly BranchGroup[]): Map<string, BranchGroup[]> {
  const bySite = new Map<string, BranchGroup[]>();

  for (const group of groups) {
    const key = `${group.site}\u0000${group.nodeInstancePath}`;
    bySite.set(key, [...(bySite.get(key) ?? []), group]);
  }

  return bySite;
}

/**
 * When every branch of a nested composition rejects the value's `type` (e.g. ImageBlock's
 * image_url vs slack_file variants both require `type: "image"`), the enclosing parent branch
 * was never meant for this value either.
 */
function effectivelyMismatchedKeys(groups: readonly BranchGroup[]): Set<string> {
  const bySite = indexGroupsBySite(groups);
  const keys = new Set<string>();

  for (const group of groups) {
    if (group.hasDiscriminatorMismatch) {
      keys.add(`${group.branchPrefix}\u0000${group.nodeInstancePath}`);
    }
  }

  for (const siteGroups of bySite.values()) {
    const nested = siteGroups[0];
    if (!nested || !siteGroups.every((group) => group.hasDiscriminatorMismatch)) {
      continue;
    }

    const parentBranchPrefix = nested.site.replace(/\/(anyOf|oneOf|allOf)$/, '');
    if (parentBranchPrefix === nested.site) {
      continue;
    }

    keys.add(`${parentBranchPrefix}\u0000${nested.nodeInstancePath}`);
  }

  return keys;
}

function errorsUnderBranch(
  group: BranchGroup,
  errors: readonly SchemaValidationErrorLike[]
): SchemaValidationErrorLike[] {
  return errors.filter(
    (error) => error.schemaPath === group.branchPrefix || error.schemaPath.startsWith(`${group.branchPrefix}/`)
  );
}

/** Liquid-tolerance fallbacks only fail with a root `type: string` error under the branch. */
function isLiquidFallbackBranch(group: BranchGroup, errors: readonly SchemaValidationErrorLike[]): boolean {
  const underBranch = errorsUnderBranch(group, errors);

  return (
    underBranch.length > 0 &&
    underBranch.every((error) => error.keyword === 'type' && error.schemaPath === `${group.branchPrefix}/type`)
  );
}

function isPayloadShapeError(error: SchemaValidationErrorLike, branchPrefix: string): boolean {
  if (!(error.schemaPath === branchPrefix || error.schemaPath.startsWith(`${branchPrefix}/`))) {
    return false;
  }

  // Composition wrappers (KnownBlock's union of $refs) and liquid `type: string` are not payload.
  if (error.keyword === 'anyOf' || error.keyword === 'oneOf') {
    return false;
  }

  if (error.keyword === 'type' && error.schemaPath === `${branchPrefix}/type`) {
    return false;
  }

  return true;
}

/**
 * Type-matched object branches that still failed on payload shape under the branch prefix.
 * Needed separately from discriminated sites: when `type` is correct, both the object branch and
 * its liquid sibling "match", so that block never becomes a single-winner site — yet its
 * `required` errors are the ones we want to keep, and foreign type-consts should stay shadowed.
 */
function concreteWinnerGroups(
  groups: readonly BranchGroup[],
  errors: readonly SchemaValidationErrorLike[],
  mismatched: ReadonlySet<string>
): BranchGroup[] {
  return groups.filter((group) => {
    const key = `${group.branchPrefix}\u0000${group.nodeInstancePath}`;
    if (mismatched.has(key) || isLiquidFallbackBranch(group, errors)) {
      return false;
    }

    return errorsUnderBranch(group, errors).some((error) => isPayloadShapeError(error, group.branchPrefix));
  });
}

/**
 * Every type-matched object branch, including those whose only failures AJV re-based into a
 * shared `$ref` definition (so nothing remains under the branch prefix). Used solely as input
 * to {@link uniqueConcreteWinners}; must not feed the liquid/type-const `winners` set, or
 * composition wrappers like KnownBlock would suppress the unknown-`type` const signal.
 */
function typeMatchedConcreteGroups(
  groups: readonly BranchGroup[],
  errors: readonly SchemaValidationErrorLike[],
  mismatched: ReadonlySet<string>
): BranchGroup[] {
  return groups.filter((group) => {
    const key = `${group.branchPrefix}\u0000${group.nodeInstancePath}`;

    return !mismatched.has(key) && !isLiquidFallbackBranch(group, errors);
  });
}

function findDiscriminatedSites(
  groups: readonly BranchGroup[],
  errors: readonly SchemaValidationErrorLike[],
  mismatched: ReadonlySet<string>,
  dataAtPath: unknown
): DiscriminatedSite[] {
  const bySite = indexGroupsBySite(groups);
  const sites: DiscriminatedSite[] = [];

  for (const siteGroups of bySite.values()) {
    const matched = siteGroups.filter(
      (group) => !mismatched.has(`${group.branchPrefix}\u0000${group.nodeInstancePath}`)
    );
    const selected = matched[0];
    const isDiscriminated = matched.length === 1 && siteGroups.length > matched.length;

    if (
      !isDiscriminated ||
      !selected ||
      !hasStringTypeField(resolveInstancePath(dataAtPath, selected.nodeInstancePath))
    ) {
      continue;
    }

    sites.push({
      selectedBranchPrefix: selected.branchPrefix,
      nodeInstancePath: selected.nodeInstancePath,
      selectedIsLiquid: isLiquidFallbackBranch(selected, errors),
    });
  }

  return sites;
}

function isShadowedBy(
  error: SchemaValidationErrorLike,
  site: DiscriminatedSite,
  winners: ReadonlySet<string>
): boolean {
  if (!isOnSameInstanceChain(error.instancePath, site.nodeInstancePath)) {
    return false;
  }

  // Unknown `type`: every block definition falls through to its liquid branch. Keep sibling
  // type-const signals so the caller still sees an error on the type field (deduped later).
  // When a concrete block already matched, those consts stay shadowed — they are noise.
  if (site.selectedIsLiquid && isTypeDiscriminatorError(error) && !winners.has(site.nodeInstancePath)) {
    return false;
  }

  const { selectedBranchPrefix } = site;
  if (error.schemaPath === selectedBranchPrefix || error.schemaPath.startsWith(`${selectedBranchPrefix}/`)) {
    return false;
  }

  // Sibling-branch noise is about one instance node, its `type` field, and enclosing parents
  // (`/blocks`, ``). Nested properties like `/blocks/0/details` are a different validation — a
  // rejected RichTextBlock attempt at `/blocks/0` must not swallow the real
  // `details: $ref RichTextBlock` failure underneath.
  const isAtSiteNode = error.instancePath === site.nodeInstancePath;
  const isDiscriminatorChild = error.instancePath === `${site.nodeInstancePath}/type`;
  const isAncestorOfSite =
    error.instancePath !== site.nodeInstancePath && isInstancePathPrefix(error.instancePath, site.nodeInstancePath);
  if (!isAtSiteNode && !isDiscriminatorChild && !isAncestorOfSite) {
    return false;
  }

  const isCompositionKeyword = error.keyword === 'anyOf' || error.keyword === 'oneOf';
  if (isCompositionKeyword && selectedBranchPrefix.startsWith(`${error.schemaPath}/`)) {
    return true;
  }

  return compositionSegments(selectedBranchPrefix).some(({ site: chainSite, branchIndex }) => {
    if (!error.schemaPath.startsWith(`${chainSite}/`)) {
      return false;
    }
    const [errorBranchIndex] = error.schemaPath.slice(chainSite.length + 1).split('/');

    return errorBranchIndex !== undefined && /^\d+$/.test(errorBranchIndex) && errorBranchIndex !== branchIndex;
  });
}

type SchemaNodeLike = Record<string, unknown>;

function isSchemaObject(value: unknown): value is SchemaNodeLike {
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

function resolveSchemaPointer(root: SchemaNodeLike, pointer: string): unknown {
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
function reachableSchemaNodes(
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

function instanceSegmentsBetween(nodeInstancePath: string, errorInstancePath: string): string[] {
  if (errorInstancePath === nodeInstancePath) {
    return [];
  }

  return errorInstancePath
    .slice(nodeInstancePath.length + 1)
    .split('/')
    .map(decodePointerSegment);
}

type ConcreteWinner = {
  nodeInstancePath: string;
  branchPrefix: string;
};

function definitionRootOf(branchPrefix: string): string | undefined {
  const match = /^#\/definitions\/[^/]+/.exec(branchPrefix);

  return match?.[0];
}

/** Longest schema-path prefix shared by every entry, cut on `/` boundaries. */
function longestCommonBranchPrefix(prefixes: readonly string[]): string | undefined {
  const [first] = prefixes;
  if (!first) {
    return undefined;
  }

  if (prefixes.length === 1) {
    return first;
  }

  const segments = first.split('/');
  let sharedLength = segments.length;

  for (const prefix of prefixes.slice(1)) {
    const other = prefix.split('/');
    let index = 0;
    while (index < sharedLength && index < other.length && segments[index] === other[index]) {
      index += 1;
    }
    sharedLength = index;
  }

  if (sharedLength < 2) {
    return undefined;
  }

  return segments.slice(0, sharedLength).join('/');
}

/**
 * The string `const`/`enum` on `properties.type`, including the liquid-tolerant
 * `anyOf: [const, pattern]` wrapper. Composition-only wrappers like KnownBlock have none.
 */
function branchTypeDiscriminator(rootSchema: SchemaNodeLike, branchPrefix: string): string | undefined {
  const branch = resolveSchemaPointer(rootSchema, branchPrefix);
  if (!isSchemaObject(branch)) {
    return undefined;
  }

  const typeSchema = isSchemaObject(branch.properties) ? branch.properties.type : undefined;
  if (!isSchemaObject(typeSchema)) {
    return undefined;
  }

  if (typeof typeSchema.const === 'string') {
    return typeSchema.const;
  }

  if (Array.isArray(typeSchema.enum) && typeof typeSchema.enum[0] === 'string' && typeSchema.enum.length === 1) {
    return typeSchema.enum[0];
  }

  if (Array.isArray(typeSchema.anyOf)) {
    for (const option of typeSchema.anyOf) {
      if (isSchemaObject(option) && typeof option.const === 'string') {
        return option.const;
      }
    }
  }

  return undefined;
}

/**
 * When a block's only failures live under a `$ref`'d property, AJV never emits an error under
 * that block's own branch prefix — so {@link typeMatchedConcreteGroups} has nothing to offer.
 * Scan definitions for the unique object branch whose type discriminator equals `expectedType`.
 */
function discoverTypeMatchedBranchPrefix(rootSchema: SchemaNodeLike, expectedType: string): string | undefined {
  const definitions = isSchemaObject(rootSchema.definitions) ? rootSchema.definitions : undefined;
  if (!definitions) {
    return undefined;
  }

  const matches: string[] = [];

  for (const [name, definition] of Object.entries(definitions)) {
    if (!isSchemaObject(definition)) {
      continue;
    }

    if (Array.isArray(definition.anyOf)) {
      definition.anyOf.forEach((branch, index) => {
        if (!isSchemaObject(branch) || branch.type !== 'object') {
          return;
        }

        const prefix = `#/definitions/${name}/anyOf/${index}`;
        if (branchTypeDiscriminator(rootSchema, prefix) === expectedType) {
          matches.push(prefix);
        }
      });
    } else if (definition.type === 'object') {
      const prefix = `#/definitions/${name}`;
      if (branchTypeDiscriminator(rootSchema, prefix) === expectedType) {
        matches.push(prefix);
      }
    }
  }

  const unique = [...new Set(matches)];

  return unique.length === 1 ? unique[0] : undefined;
}

/**
 * Winner branches usable as a reachability-shadowing authority. Nested variant unions
 * (ImageBlock's image_url vs slack_file) contribute several type-matched groups under one
 * definition; those coalesce to their common parent so shared-`$ref` foreign errors can still
 * be shadowed without pretending one nested variant won.
 *
 * KnownBlock (and similar composition-only wrappers) also appear as type-matched groups because
 * they have no `properties.type` of their own — they are ignored in favour of the definition
 * whose type discriminator equals the instance's `type`.
 */
function uniqueConcreteWinners(
  winnerGroups: readonly BranchGroup[],
  rootSchema: SchemaNodeLike,
  dataAtPath: unknown
): ConcreteWinner[] {
  const byPath = new Map<string, BranchGroup[]>();

  for (const group of winnerGroups) {
    byPath.set(group.nodeInstancePath, [...(byPath.get(group.nodeInstancePath) ?? []), group]);
  }

  // Instance nodes that carry a string `type` even when no error group was emitted under the
  // matching branch (shared-`$ref`-only failures).
  const typedInstancePaths = new Set<string>(byPath.keys());
  const collectTypedPaths = (value: unknown, path: string) => {
    if (hasStringTypeField(value)) {
      typedInstancePaths.add(path);
    }

    if (value === null || typeof value !== 'object') {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry, index) => {
        collectTypedPaths(entry, `${path}/${index}`);
      });

      return;
    }

    for (const [key, child] of Object.entries(value)) {
      collectTypedPaths(child, path === '' ? `/${key}` : `${path}/${key}`);
    }
  };
  collectTypedPaths(dataAtPath, '');

  const winners: ConcreteWinner[] = [];

  for (const nodeInstancePath of typedInstancePaths) {
    if (nodeInstancePath === '') {
      continue;
    }

    const instanceType = resolveInstancePath(dataAtPath, nodeInstancePath);
    if (!hasStringTypeField(instanceType)) {
      continue;
    }

    const expectedType = (instanceType as { type: string }).type;
    const groupsAtPath = byPath.get(nodeInstancePath) ?? [];
    const byDefinition = new Map<string, string[]>();

    for (const group of groupsAtPath) {
      const root = definitionRootOf(group.branchPrefix);
      if (!root) {
        continue;
      }

      if (branchTypeDiscriminator(rootSchema, group.branchPrefix) !== expectedType) {
        continue;
      }

      byDefinition.set(root, [...(byDefinition.get(root) ?? []), group.branchPrefix]);
    }

    let branchPrefix: string | undefined;

    if (byDefinition.size === 1) {
      const prefixes = [...byDefinition.values()][0] as string[];
      branchPrefix = longestCommonBranchPrefix(prefixes);
    } else if (byDefinition.size === 0) {
      branchPrefix = discoverTypeMatchedBranchPrefix(rootSchema, expectedType);
    }

    if (!branchPrefix) {
      continue;
    }

    winners.push({ nodeInstancePath, branchPrefix });
  }

  return winners;
}

function deepestWinnerContaining(winners: readonly ConcreteWinner[], instancePath: string): ConcreteWinner | undefined {
  let deepest: ConcreteWinner | undefined;

  for (const winner of winners) {
    if (!isInstancePathPrefix(winner.nodeInstancePath, instancePath)) {
      continue;
    }

    if (!deepest || winner.nodeInstancePath.length > deepest.nodeInstancePath.length) {
      deepest = winner;
    }
  }

  return deepest;
}

/**
 * AJV re-bases errors produced through a `$ref` onto the shared definition (`#/definitions/
 * MrkdwnElement/...`), which severs them from the branch that walked into the ref. When a
 * rejected sibling block does so, the composition-site shadowing above never sees a shared site
 * and the error leaks — e.g. a `task_card` block missing `status` also shows "title must be
 * object" from CardBlock's `title: $ref MrkdwnElement`.
 *
 * With the root schema available, the winning branch is walked to the error's instance location;
 * an error anchored somewhere the winner provably cannot reach belongs to a rejected sibling and
 * is shadowed. Anything the walk cannot prove is kept: noisier output, never wrong output.
 */
function isForeignToWinner(
  error: SchemaValidationErrorLike,
  winner: ConcreteWinner,
  rootSchema: SchemaNodeLike
): boolean {
  if (error.schemaPath === winner.branchPrefix || error.schemaPath.startsWith(`${winner.branchPrefix}/`)) {
    return false;
  }

  const branchSchema = resolveSchemaPointer(rootSchema, winner.branchPrefix);
  if (!isSchemaObject(branchSchema)) {
    return false;
  }

  const keywordIndex = error.schemaPath.lastIndexOf('/');
  if (keywordIndex <= 0) {
    return false;
  }

  const errorAnchor = resolveSchemaPointer(rootSchema, error.schemaPath.slice(0, keywordIndex));
  if (!isSchemaObject(errorAnchor)) {
    return false;
  }

  const reachable = reachableSchemaNodes(
    rootSchema,
    branchSchema,
    instanceSegmentsBetween(winner.nodeInstancePath, error.instancePath)
  );

  if (reachable === undefined) {
    return false;
  }

  return !reachable.has(errorAnchor);
}

/** At most one type-discriminator const/enum per instance path (unknown `type` hits every block). */
function dedupeTypeDiscriminators<TError extends SchemaValidationErrorLike>(errors: readonly TError[]): TError[] {
  const seenTypePaths = new Set<string>();

  return errors.filter((error) => {
    if (!isTypeDiscriminatorError(error)) {
      return true;
    }

    if (seenTypePaths.has(error.instancePath)) {
      return false;
    }

    seenTypePaths.add(error.instancePath);

    return true;
  });
}

/**
 * AJV reports every branch of a union, so one typo inside a Block Kit block yields a useless
 * "must match a schema in anyOf" plus the failures of every other block type it tried. When the
 * failing node carries a `type` that lines up with exactly one branch, this keeps only that
 * branch's errors and drops the rejected siblings and the enclosing composition noise.
 *
 * Nested variant unions (ImageBlock's image_url vs slack_file) treat a full type rejection as a
 * parent mismatch so the object-vs-liquid union can select the liquid fallback and drop
 * required-field noise. When every discriminated site for a node falls through to liquid
 * (unknown `type`), type-discriminator errors are preserved (one per instance path).
 *
 * `dataAtPath` is the value the errors were produced against; `instancePath`s resolve against it.
 * `rootSchema`, when provided, must be the schema the errors were validated against (with
 * document-absolute `schemaPath`s); it additionally shadows rejected-sibling errors that AJV
 * anchored inside shared `$ref` definitions — see {@link isForeignToWinner}.
 */
export function selectDiscriminatedErrors<TError extends SchemaValidationErrorLike>(
  errors: readonly TError[],
  dataAtPath: unknown,
  rootSchema?: object
): TError[] {
  const groups = groupBranches(errors);
  const mismatched = effectivelyMismatchedKeys(groups);
  const sites = findDiscriminatedSites(groups, errors, mismatched, dataAtPath);

  if (sites.length === 0) {
    return [...errors];
  }

  const winnerGroups = concreteWinnerGroups(groups, errors, mismatched);
  const winners = new Set(winnerGroups.map((group) => group.nodeInstancePath));
  const schemaRoot = isSchemaObject(rootSchema) ? rootSchema : undefined;
  const shadowingWinners = schemaRoot
    ? uniqueConcreteWinners(typeMatchedConcreteGroups(groups, errors, mismatched), schemaRoot, dataAtPath)
    : [];

  // A shared-`$ref`-only failure still needs to suppress sibling type-consts.
  for (const winner of shadowingWinners) {
    winners.add(winner.nodeInstancePath);
  }

  return dedupeTypeDiscriminators(
    errors.filter((error) => {
      if (sites.some((site) => isShadowedBy(error, site, winners))) {
        return false;
      }

      if (!schemaRoot) {
        return true;
      }

      const winner = deepestWinnerContaining(shadowingWinners, error.instancePath);

      return !winner || !isForeignToWinner(error, winner, schemaRoot);
    })
  );
}
