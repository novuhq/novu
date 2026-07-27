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
 * A type-matched object branch that still failed on payload shape. Needed separately from
 * discriminated sites: when `type` is correct, both the object branch and its liquid sibling
 * "match", so that block never becomes a single-winner site — yet its `required` errors are
 * the ones we want to keep, and foreign type-consts should stay shadowed.
 */
function concreteWinnerPaths(
  groups: readonly BranchGroup[],
  errors: readonly SchemaValidationErrorLike[],
  mismatched: ReadonlySet<string>
): Set<string> {
  return new Set(
    groups
      .filter((group) => {
        const key = `${group.branchPrefix}\u0000${group.nodeInstancePath}`;
        if (mismatched.has(key) || isLiquidFallbackBranch(group, errors)) {
          return false;
        }

        return errorsUnderBranch(group, errors).some((error) => isPayloadShapeError(error, group.branchPrefix));
      })
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
 */
export function selectDiscriminatedErrors<TError extends SchemaValidationErrorLike>(
  errors: readonly TError[],
  dataAtPath: unknown
): TError[] {
  const groups = groupBranches(errors);
  const mismatched = effectivelyMismatchedKeys(groups);
  const sites = findDiscriminatedSites(groups, errors, mismatched, dataAtPath);

  if (sites.length === 0) {
    return [...errors];
  }

  const winners = concreteWinnerPaths(groups, errors, mismatched);

  return dedupeTypeDiscriminators(errors.filter((error) => !sites.some((site) => isShadowedBy(error, site, winners))));
}
