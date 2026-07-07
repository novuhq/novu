import type { StepResponseDto, WorkflowResponseDto } from '@novu/shared';
import { getIdFromSlug, STEP_DIVIDER, WORKFLOW_DIVIDER } from '@/utils/id-utils';
import { loadFromStorage, saveToStorage, clearFromStorage } from '@/utils/local-storage';

/**
 * A local bridge session connects the dashboard's "Local" pseudo-environment
 * to the developer's machine: `novu dev` opens the /local handshake with the
 * tunnel coordinates, and we keep them per-organization in localStorage.
 * Nothing is persisted server-side — the tunnel URL is sent along with each
 * stateless bridge request instead.
 */
export type LocalBridgeSession = {
  environmentId: string;
  environmentSlug: string;
  /** Public origin of the dev tunnel, e.g. https://abc123.novu.sh */
  tunnelOrigin: string;
  /** Path of the bridge endpoint within the app, e.g. /api/novu */
  route: string;
  connectedAt: string;
  lastHealthyAt?: string;
};

const STORAGE_KEY_PREFIX = 'novu-local-bridge';
const DATA_KEY = 'localBridgeSession';

const storageKey = (organizationId: string) => `${STORAGE_KEY_PREFIX}-${organizationId}`;

export function loadLocalBridgeSession(organizationId?: string): LocalBridgeSession | null {
  if (!organizationId) return null;

  return loadFromStorage<LocalBridgeSession>(storageKey(organizationId), DATA_KEY);
}

export function saveLocalBridgeSession(organizationId: string, session: LocalBridgeSession): void {
  saveToStorage(storageKey(organizationId), session, DATA_KEY);
}

export function clearLocalBridgeSession(organizationId: string): void {
  clearFromStorage(storageKey(organizationId), DATA_KEY);
}

export function buildLocalBridgeUrl(session: Pick<LocalBridgeSession, 'tunnelOrigin' | 'route'>): string {
  return new URL(session.route || '/', session.tunnelOrigin).toString();
}

/**
 * Resolve a virtual workflow from the discover cache. Different editor
 * surfaces reference workflows by different keys — the URL uses the slug
 * (`name_wf_<id>`), the step editor passes the raw `workflowId` — so match on
 * any of them.
 */
export function findLocalWorkflow(
  workflows: WorkflowResponseDto[] | undefined,
  reference: string
): WorkflowResponseDto | undefined {
  if (!reference) return undefined;

  const referenceId = getIdFromSlug({ slug: reference, divider: WORKFLOW_DIVIDER });

  return workflows?.find(
    (candidate) =>
      candidate.workflowId === reference ||
      candidate.slug === reference ||
      candidate._id === referenceId ||
      getIdFromSlug({ slug: candidate.slug, divider: WORKFLOW_DIVIDER }) === referenceId
  );
}

/** Same as {@link findLocalWorkflow}, for steps (slug, raw `stepId`, or `_id`). */
export function findLocalStep(
  workflow: WorkflowResponseDto | undefined,
  reference: string
): StepResponseDto | undefined {
  if (!reference) return undefined;

  const referenceId = getIdFromSlug({ slug: reference, divider: STEP_DIVIDER });

  return workflow?.steps.find(
    (candidate) =>
      candidate.stepId === reference ||
      candidate.slug === reference ||
      candidate._id === referenceId ||
      getIdFromSlug({ slug: candidate.slug, divider: STEP_DIVIDER }) === referenceId
  );
}
