import {
  ContentIssueEnum,
  type ContentOverrideProviderId,
  getProviderOverrideKeys,
  INTEGRATION_OVERRIDES_OUTPUT_KEY,
  type RuntimeIssue,
} from '@novu/shared';
import { getOverridePath, PROVIDER_OVERRIDES_FIELD, type SourceOverride } from './override-source';

/** A server control issue, with the control path it was reported under. */
export type OverrideServerIssue = RuntimeIssue & { path: string };

export type OverrideIssues = {
  /** Server control issues still worth showing; top-level unsupported keys are reported in `unsupportedKeys`. */
  serverIssues: OverrideServerIssue[];
  /** Root keys of the form's override that its provider does not accept. */
  unsupportedKeys: string[];
};

export function getUnsupportedOverrideKeys(
  providerId: ContentOverrideProviderId,
  override: Record<string, unknown> | undefined
): string[] {
  const overrideKeys = Object.keys(override ?? {});
  const allowedKeys = getProviderOverrideKeys(providerId);

  // Free-form providers accept any key, except the one the bridge uses to carry integration overrides.
  if (!allowedKeys) {
    return overrideKeys.filter((key) => key === INTEGRATION_OVERRIDES_OUTPUT_KEY);
  }

  const allowedKeySet = new Set(allowedKeys);

  return overrideKeys.filter((key) => !allowedKeySet.has(key));
}

/**
 * The override path a server control issue belongs to. Provider ids never contain dots, so the
 * provider is read off the path; integration identifiers are free-form, so the issue is matched
 * against the known integration override paths, the longest (most specific) one winning.
 */
export function getOverrideIssueOwnerPath(
  issuePath: string,
  integrationOverridePaths: readonly string[]
): string | undefined {
  if (issuePath.startsWith(`${PROVIDER_OVERRIDES_FIELD}.`)) {
    const providerId = issuePath.slice(PROVIDER_OVERRIDES_FIELD.length + 1).split('.')[0];

    return `${PROVIDER_OVERRIDES_FIELD}.${providerId}`;
  }

  let ownerPath: string | undefined;

  for (const path of integrationOverridePaths) {
    const ownsIssue = issuePath === path || issuePath.startsWith(`${path}.`);
    if (ownsIssue && path.length > (ownerPath?.length ?? 0)) {
      ownerPath = path;
    }
  }

  return ownerPath;
}

/**
 * True when a control-issue path is a top-level key under an override path (`getOverridePath`).
 * Those UNSUPPORTED_PROPERTY issues are mirrored client-side by `getUnsupportedOverrideKeys`;
 * nested paths (e.g. `…document.link`) are not, so the server issue must still be shown.
 */
export function isTopLevelOverrideIssuePath(issuePath: string, overridePath: string): boolean {
  if (!issuePath.startsWith(`${overridePath}.`)) {
    return false;
  }

  const relative = issuePath.slice(overridePath.length + 1);

  return relative.length > 0 && !relative.includes('.');
}

/**
 * Whether a server control issue should still be shown for a provider or integration override.
 * Top-level UNSUPPORTED_PROPERTY is mirrored client-side; nested ones are not.
 */
export function shouldKeepServerOverrideIssue(
  issue: { issueType: string; variableName?: string },
  fallbackPath: string,
  overridePath: string
): boolean {
  if (issue.issueType !== ContentIssueEnum.UNSUPPORTED_PROPERTY) {
    return true;
  }

  return !isTopLevelOverrideIssuePath(issue.variableName ?? fallbackPath, overridePath);
}

/**
 * Groups the form's unsupported keys and the step's server control issues by the override path that
 * owns them (`getOverridePath`). Overrides without issues have no entry.
 */
export function buildOverrideIssueIndex(
  controlIssues: Record<string, RuntimeIssue[]> | undefined,
  sourceOverrides: SourceOverride[]
): Map<string, OverrideIssues> {
  const index = new Map<string, OverrideIssues>();

  const getEntry = (path: string): OverrideIssues => {
    const existing = index.get(path);
    if (existing) {
      return existing;
    }

    const created: OverrideIssues = { serverIssues: [], unsupportedKeys: [] };
    index.set(path, created);

    return created;
  };

  for (const { source, override } of sourceOverrides) {
    const unsupportedKeys = getUnsupportedOverrideKeys(source.providerId, override);
    if (unsupportedKeys.length > 0) {
      getEntry(getOverridePath(source)).unsupportedKeys.push(...unsupportedKeys);
    }
  }

  const integrationOverridePaths = sourceOverrides
    .filter(({ source }) => source.kind === 'integration')
    .map(({ source }) => getOverridePath(source));

  for (const [path, issueList] of Object.entries(controlIssues ?? {})) {
    const ownerPath = getOverrideIssueOwnerPath(path, integrationOverridePaths);
    if (!ownerPath) {
      continue;
    }

    const serverIssues = issueList
      .filter((issue) => shouldKeepServerOverrideIssue(issue, path, ownerPath))
      .map((issue) => ({ ...issue, path }));
    if (serverIssues.length > 0) {
      getEntry(ownerPath).serverIssues.push(...serverIssues);
    }
  }

  return index;
}

export function countOverrideIssues({ serverIssues, unsupportedKeys }: OverrideIssues): number {
  return serverIssues.length + unsupportedKeys.length;
}
