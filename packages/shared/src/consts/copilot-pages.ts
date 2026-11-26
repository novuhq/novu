/**
 * Dashboard pages the Copilot can open on outside the workflow editor. The organization-scoped `COPILOT_PAGES` flag
 * lists the ones that are on; each name turns on that page's launcher and its tool group in the Copilot session.
 */
export enum CopilotPageEnum {
  ACTIVITY = 'activity',
  SUBSCRIBERS = 'subscribers',
  INTEGRATIONS = 'integrations',
  USAGE = 'usage',
}

const COPILOT_PAGES = new Set<string>(Object.values(CopilotPageEnum));

/**
 * Reads the `COPILOT_PAGES` flag value: a JSON array (a LaunchDarkly JSON flag), or a string holding one (environment
 * variables). Unknown names are dropped, and a missing or unusable value returns `[]`, which keeps every page off.
 */
export function parseCopilotPages(raw: unknown): CopilotPageEnum[] {
  let value = raw;

  if (typeof raw === 'string') {
    try {
      value = raw.trim() ? JSON.parse(raw) : undefined;
    } catch {
      return [];
    }
  }

  if (!Array.isArray(value)) {
    return [];
  }

  const pages = value.filter((page): page is CopilotPageEnum => typeof page === 'string' && COPILOT_PAGES.has(page));

  return [...new Set(pages)];
}

/** What the open dashboard screen shows, as the page sends it with each web-chat message. */
export type CopilotViewing = {
  /** The object open on the screen, such as the workflow run in the Activity side panel. */
  resource?: { type: CopilotViewingResourceEnum; id: string; label?: string };
  /** The page's active filters, as the page's URL holds them. */
  filters?: Record<string, string | string[]>;
};

export enum CopilotViewingResourceEnum {
  WORKFLOW_RUN = 'workflow_run',
  REQUEST = 'request',
  SUBSCRIBER = 'subscriber',
  INTEGRATION = 'integration',
}

/** Web-chat message metadata keys the dashboard sends on top of `environmentId`, `workflowId` and `stepId`. */
export type CopilotPageMetadata = {
  page?: CopilotPageEnum;
  viewing?: CopilotViewing;
};

/** Web-chat message metadata keeps only scalar values, and strings up to this many characters. */
const COPILOT_VIEWING_MAX_LENGTH = 512;

/**
 * `viewing` as the dashboard sends it: a JSON string, because web-chat metadata drops objects. When it would not fit,
 * the filters go first, then the resource label, so the open resource's id still reaches the agent.
 */
export function serializeCopilotViewing(viewing: CopilotViewing | undefined): string | undefined {
  if (!viewing?.resource && !viewing?.filters) {
    return undefined;
  }

  const { resource } = viewing;
  const candidates: CopilotViewing[] = [
    viewing,
    { resource },
    { resource: resource && { type: resource.type, id: resource.id } },
  ];

  for (const candidate of candidates) {
    if (!candidate.resource && !candidate.filters) {
      continue;
    }

    const json = JSON.stringify(candidate);

    if (json.length <= COPILOT_VIEWING_MAX_LENGTH) {
      return json;
    }
  }

  return undefined;
}
