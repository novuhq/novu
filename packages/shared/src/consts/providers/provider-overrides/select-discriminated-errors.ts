import {
  instanceSegmentsBetween,
  isSchemaObject,
  reachableSchemaNodes,
  resolveSchemaPointer,
  type SchemaNodeLike,
} from './schema-reachability';

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
 * Type-matched object branches (non-liquid, not type-mismatched). Includes branches whose only
 * failures AJV re-based into a shared `$ref` definition. Fed to {@link resolveConcreteWinners};
 * composition wrappers like KnownBlock are filtered there by discriminator, so they never enter
 * the liquid/type-const `winners` set alone.
 */
function typeMatchedGroups(
  groups: readonly BranchGroup[],
  errors: readonly SchemaValidationErrorLike[],
  mismatched: ReadonlySet<string>
): BranchGroup[] {
  return groups.filter((group) => {
    const key = `${group.branchPrefix}\u0000${group.nodeInstancePath}`;

    return !mismatched.has(key) && !isLiquidFallbackBranch(group, errors);
  });
}

/**
 * Fallback when no root schema is available: only branches that still failed on payload shape
 * under their own prefix can authoritatively suppress sibling type-consts.
 */
function payloadShapeWinnerPaths(
  groups: readonly BranchGroup[],
  errors: readonly SchemaValidationErrorLike[],
  mismatched: ReadonlySet<string>
): Set<string> {
  return new Set(
    typeMatchedGroups(groups, errors, mismatched)
      .filter((group) =>
        errorsUnderBranch(group, errors).some((error) => isPayloadShapeError(error, group.branchPrefix))
      )
      .map((group) => group.nodeInstancePath)
  );
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
 * that block's own branch prefix — so {@link typeMatchedGroups} has nothing to offer.
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
 * Single winner model for typed instance nodes: path + authoritative branch prefix.
 * Used for both type-const suppression and shared-`$ref` foreign-error shadowing.
 *
 * Nested variant unions (ImageBlock's image_url vs slack_file) contribute several type-matched
 * groups under one definition; those coalesce to their common parent. Composition-only wrappers
 * like KnownBlock have no `properties.type` and are ignored in favour of the definition whose
 * type discriminator equals the instance's `type`.
 */
function resolveConcreteWinners(
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

function branchHasTypeDiscriminator(branch: SchemaNodeLike): boolean {
  const typeSchema = isSchemaObject(branch.properties) ? branch.properties.type : undefined;
  if (!isSchemaObject(typeSchema)) {
    return false;
  }

  if (typeof typeSchema.const === 'string') {
    return true;
  }

  if (Array.isArray(typeSchema.enum) && typeSchema.enum.length > 0) {
    return true;
  }

  if (Array.isArray(typeSchema.anyOf)) {
    return typeSchema.anyOf.some((option) => isSchemaObject(option) && typeof option.const === 'string');
  }

  return false;
}

/** Site paths from {@link compositionSegments} end at `/oneOf`; resolve the parent object that owns the branches. */
function resolveOneOfContainer(rootSchema: SchemaNodeLike, site: string): SchemaNodeLike | undefined {
  if (!site.endsWith('/oneOf')) {
    return undefined;
  }

  const parent = resolveSchemaPointer(rootSchema, site.replace(/\/oneOf$/, ''));
  if (!isSchemaObject(parent) || !Array.isArray(parent.oneOf)) {
    return undefined;
  }

  return parent;
}

/** True when a oneOf is an either/or on `required` keys (e.g. MediaObject id vs link), not on `type`. */
function oneOfUsesRequiredKeyDiscriminator(rootSchema: SchemaNodeLike, site: string): boolean {
  const oneOfContainer = resolveOneOfContainer(rootSchema, site);
  if (!oneOfContainer || !Array.isArray(oneOfContainer.oneOf) || oneOfContainer.oneOf.length < 2) {
    return false;
  }

  return oneOfContainer.oneOf.every((branch) => {
    if (!isSchemaObject(branch)) {
      return false;
    }

    if (branchHasTypeDiscriminator(branch)) {
      return false;
    }

    return Array.isArray(branch.required) && branch.required.length > 0;
  });
}

function selectRequiredKeyBranchIndex(oneOfContainer: SchemaNodeLike, value: unknown): number {
  const branches = oneOfContainer.oneOf as SchemaNodeLike[];
  const valueKeys = new Set(
    value !== null && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value) : []
  );

  const matching = branches
    .map((branch, index) => ({ branch, index }))
    .filter(({ branch }) => {
      const required = Array.isArray(branch.required) ? branch.required : [];

      return required.some((key) => typeof key === 'string' && valueKeys.has(key));
    })
    .map(({ index }) => index);

  if (matching.length >= 1) {
    return matching[0] as number;
  }

  return 0;
}

type RequiredKeyOneOfSite = {
  site: string;
  nodeInstancePath: string;
  selectedBranchIndex: number;
};

function findRequiredKeyOneOfSites(
  errors: readonly SchemaValidationErrorLike[],
  dataAtPath: unknown,
  rootSchema: SchemaNodeLike
): RequiredKeyOneOfSite[] {
  const siteKeys = new Map<string, RequiredKeyOneOfSite>();

  for (const error of errors) {
    for (const { site, branchIndex } of compositionSegments(error.schemaPath)) {
      if (!site.endsWith('/oneOf')) {
        continue;
      }

      const branchPrefix = `${site}/${branchIndex}`;
      const suffix = error.schemaPath.slice(branchPrefix.length);
      const nodeInstancePath = dropTrailingSegments(error.instancePath, instanceDepthOfSchemaSuffix(suffix));
      const key = `${site}\u0000${nodeInstancePath}`;

      if (siteKeys.has(key) || !oneOfUsesRequiredKeyDiscriminator(rootSchema, site)) {
        continue;
      }

      const oneOfContainer = resolveOneOfContainer(rootSchema, site);
      if (!oneOfContainer) {
        continue;
      }

      const value = resolveInstancePath(dataAtPath, nodeInstancePath);
      const selectedBranchIndex = selectRequiredKeyBranchIndex(oneOfContainer, value);

      siteKeys.set(key, { site, nodeInstancePath, selectedBranchIndex });
    }
  }

  return [...siteKeys.values()];
}

function isShadowedByRequiredKeyOneOf(error: SchemaValidationErrorLike, site: RequiredKeyOneOfSite): boolean {
  if (!isOnSameInstanceChain(error.instancePath, site.nodeInstancePath)) {
    return false;
  }

  const selectedPrefix = `${site.site}/${site.selectedBranchIndex}`;
  if (error.schemaPath === selectedPrefix || error.schemaPath.startsWith(`${selectedPrefix}/`)) {
    return false;
  }

  if (error.keyword === 'oneOf' && error.schemaPath === site.site) {
    return true;
  }

  if (!error.schemaPath.startsWith(`${site.site}/`)) {
    return false;
  }

  const branchIndex = error.schemaPath.slice(site.site.length + 1).split('/')[0];
  if (branchIndex === undefined || !/^\d+$/.test(branchIndex)) {
    return false;
  }

  return branchIndex !== String(site.selectedBranchIndex);
}

/**
 * AJV reports every branch of a required-key oneOf (e.g. WhatsApp MediaObject's id vs link).
 * Pick the branch whose required key is present, or the first branch when neither is.
 */
function selectRequiredKeyOneOfErrors<TError extends SchemaValidationErrorLike>(
  errors: readonly TError[],
  dataAtPath: unknown,
  rootSchema: SchemaNodeLike
): TError[] {
  const sites = findRequiredKeyOneOfSites(errors, dataAtPath, rootSchema);
  if (sites.length === 0) {
    return [...errors];
  }

  return errors.filter((error) => !sites.some((site) => isShadowedByRequiredKeyOneOf(error, site)));
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
 * anchored inside shared `$ref` definitions — see {@link isForeignToWinner}. Shared-`$ref`
 * shadowing runs whenever winners resolve, independent of whether composition sites exist.
 */
export function selectDiscriminatedErrors<TError extends SchemaValidationErrorLike>(
  errors: readonly TError[],
  dataAtPath: unknown,
  rootSchema?: object
): TError[] {
  const schemaRoot = isSchemaObject(rootSchema) ? rootSchema : undefined;
  const narrowed = schemaRoot ? selectRequiredKeyOneOfErrors(errors, dataAtPath, schemaRoot) : [...errors];
  const groups = groupBranches(narrowed);
  const mismatched = effectivelyMismatchedKeys(groups);
  const sites = findDiscriminatedSites(groups, narrowed, mismatched, dataAtPath);
  const matchedGroups = typeMatchedGroups(groups, narrowed, mismatched);

  const concreteWinners = schemaRoot ? resolveConcreteWinners(matchedGroups, schemaRoot, dataAtPath) : [];
  const winners = schemaRoot
    ? new Set(concreteWinners.map((winner) => winner.nodeInstancePath))
    : payloadShapeWinnerPaths(groups, narrowed, mismatched);

  if (sites.length === 0 && concreteWinners.length === 0) {
    return narrowed;
  }

  return dedupeTypeDiscriminators(
    narrowed.filter((error) => {
      if (sites.some((site) => isShadowedBy(error, site, winners))) {
        return false;
      }

      if (!schemaRoot) {
        return true;
      }

      const winner = deepestWinnerContaining(concreteWinners, error.instancePath);

      return !winner || !isForeignToWinner(error, winner, schemaRoot);
    })
  );
}
