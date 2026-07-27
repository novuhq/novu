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
  hasDiscriminatorMismatch: boolean;
};

type DiscriminatedSite = {
  selectedBranchPrefix: string;
  nodeInstancePath: string;
};

/**
 * When every branch of a nested composition rejects the value's `type` (e.g. ImageBlock's
 * image_url vs slack_file variants both require `type: "image"`), the enclosing parent branch
 * was never meant for this value either. Bubble that mismatch one level up so the parent
 * object-vs-liquid union can select the liquid fallback and shadow required-field noise.
 */
function bubbleNestedDiscriminatorMismatches(groups: BranchGroup[]): void {
  const bySite = new Map<string, BranchGroup[]>();

  for (const group of groups) {
    const key = `${group.site}\u0000${group.nodeInstancePath}`;
    bySite.set(key, [...(bySite.get(key) ?? []), group]);
  }

  for (const siteGroups of bySite.values()) {
    if (siteGroups.length === 0 || !siteGroups.every((group) => group.hasDiscriminatorMismatch)) {
      continue;
    }

    const nestedSite = siteGroups[0]?.site;
    if (!nestedSite) {
      continue;
    }

    const parentBranchPrefix = nestedSite.replace(/\/(anyOf|oneOf|allOf)$/, '');
    if (parentBranchPrefix === nestedSite) {
      continue;
    }

    const nodeInstancePath = siteGroups[0]?.nodeInstancePath;
    for (const group of groups) {
      if (group.branchPrefix === parentBranchPrefix && group.nodeInstancePath === nodeInstancePath) {
        group.hasDiscriminatorMismatch = true;
      }
    }
  }
}

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

/** Liquid-tolerance fallbacks only fail with a root `type: string` error under the branch. */
function isLiquidFallbackBranch(group: BranchGroup, errors: readonly SchemaValidationErrorLike[]): boolean {
  const underBranch = errors.filter(
    (error) => error.schemaPath === group.branchPrefix || error.schemaPath.startsWith(`${group.branchPrefix}/`)
  );

  return (
    underBranch.length > 0 &&
    underBranch.every((error) => error.keyword === 'type' && error.schemaPath === `${group.branchPrefix}/type`)
  );
}

/**
 * A branch that accepted the `type` discriminator but still failed on payload shape. Composition
 * wrappers (KnownBlock's union of $refs) are not winners — only property-level failures count.
 */
function isConcreteWinningBranch(group: BranchGroup, errors: readonly SchemaValidationErrorLike[]): boolean {
  if (group.hasDiscriminatorMismatch || isLiquidFallbackBranch(group, errors)) {
    return false;
  }

  return errors.some((error) => {
    if (!(error.schemaPath === group.branchPrefix || error.schemaPath.startsWith(`${group.branchPrefix}/`))) {
      return false;
    }

    switch (error.keyword) {
      case 'required':
      case 'additionalProperties':
      case 'minItems':
      case 'maxItems':
      case 'minLength':
      case 'maxLength':
      case 'minimum':
      case 'maximum':
      case 'pattern':
        return true;
      case 'type':
      case 'const':
      case 'enum':
        return error.schemaPath.includes('/properties/') && !error.schemaPath.includes('/properties/type/');
      default:
        return false;
    }
  });
}

function concreteWinnerPaths(
  groups: readonly BranchGroup[],
  errors: readonly SchemaValidationErrorLike[]
): Set<string> {
  return new Set(
    groups.filter((group) => isConcreteWinningBranch(group, errors)).map((group) => group.nodeInstancePath)
  );
}

function findDiscriminatedSites(groups: readonly BranchGroup[], dataAtPath: unknown): DiscriminatedSite[] {
  const bySite = new Map<string, BranchGroup[]>();

  for (const group of groups) {
    const key = `${group.site}\u0000${group.nodeInstancePath}`;
    bySite.set(key, [...(bySite.get(key) ?? []), group]);
  }

  const sites: DiscriminatedSite[] = [];

  for (const siteGroups of bySite.values()) {
    const matched = siteGroups.filter((group) => !group.hasDiscriminatorMismatch);
    const selected = matched[0];
    const isDiscriminated = matched.length === 1 && siteGroups.length > matched.length;

    if (
      !isDiscriminated ||
      !selected ||
      !hasStringTypeField(resolveInstancePath(dataAtPath, selected.nodeInstancePath))
    ) {
      continue;
    }

    sites.push({ selectedBranchPrefix: selected.branchPrefix, nodeInstancePath: selected.nodeInstancePath });
  }

  return sites;
}

function isShadowedBy(error: SchemaValidationErrorLike, site: DiscriminatedSite): boolean {
  if (!isOnSameInstanceChain(error.instancePath, site.nodeInstancePath)) {
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

function isCompositionNoise(error: SchemaValidationErrorLike): boolean {
  return error.keyword === 'anyOf' || error.keyword === 'oneOf';
}

function isLiquidRootTypeError(error: SchemaValidationErrorLike): boolean {
  return error.keyword === 'type' && /\/(?:anyOf|oneOf)\/\d+\/type$/.test(error.schemaPath);
}

/**
 * AJV reports every branch of a union, so one typo inside a Block Kit block yields a useless
 * "must match a schema in anyOf" plus the failures of every other block type it tried. When the
 * failing node carries a `type` that lines up with exactly one branch, this keeps only that
 * branch's errors and drops the rejected siblings and the enclosing composition noise.
 *
 * Nested variant unions (ImageBlock's image_url vs slack_file) bubble a full type rejection up
 * so the parent can select the liquid fallback and drop required-field noise. When no concrete
 * branch matches at all (unknown `type`), one discriminator error is restored onto the type
 * field so the caller still sees a useful signal instead of a bare anyOf.
 *
 * `dataAtPath` is the value the errors were produced against; `instancePath`s resolve against it.
 */
export function selectDiscriminatedErrors<TError extends SchemaValidationErrorLike>(
  errors: readonly TError[],
  dataAtPath: unknown
): TError[] {
  const groups = groupBranches(errors);
  bubbleNestedDiscriminatorMismatches(groups);
  const sites = findDiscriminatedSites(groups, dataAtPath);

  if (sites.length === 0) {
    return [...errors];
  }

  const narrowed = errors.filter((error) => !sites.some((site) => isShadowedBy(error, site)));
  const winners = concreteWinnerPaths(groups, errors);
  const restored: TError[] = [];
  const restoredPaths = new Set<string>();

  for (const path of new Set(sites.map((site) => site.nodeInstancePath))) {
    if (winners.has(path)) {
      continue;
    }

    const hasConcreteSignal = narrowed.some(
      (error) =>
        isOnSameInstanceChain(error.instancePath, path) && !isCompositionNoise(error) && !isLiquidRootTypeError(error)
    );
    if (hasConcreteSignal) {
      continue;
    }

    const typeError = errors.find(
      (error) => isTypeDiscriminatorError(error) && isOnSameInstanceChain(error.instancePath, path)
    );
    if (typeError && !restoredPaths.has(path)) {
      restored.push(typeError);
      restoredPaths.add(path);
    }
  }

  return [...narrowed, ...restored];
}
