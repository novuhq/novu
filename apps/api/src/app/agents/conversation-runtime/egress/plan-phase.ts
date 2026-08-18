import type { PlanTaskStatus } from 'chat';

export type PlanPhase = 'thinking' | 'awaiting-approval' | 'approved' | 'denied' | 'finished' | 'failed';

const PHASE_TITLE: Record<PlanPhase, string> = {
  thinking: 'Thinking…',
  'awaiting-approval': 'Waiting for approval…',
  approved: 'Approved, resuming…',
  denied: 'Denied, resuming…',
  finished: 'Finished thinking',
  failed: 'Something went wrong',
};

const PHASE_TITLE_EMOJI: Record<PlanPhase, string> = {
  thinking: '🧠',
  'awaiting-approval': '⏳',
  approved: '✅',
  denied: '🚫',
  finished: '✅',
  failed: '❌',
};

export function planTitleForPhase(phase: PlanPhase): string {
  return PHASE_TITLE[phase];
}

export function planTitleEmojiForPhase(phase: PlanPhase): string {
  return PHASE_TITLE_EMOJI[phase];
}

export function formatToolDisplayName(toolName: string | undefined, mcpServerName?: string): string {
  const name = toolName?.trim() || 'Tool';

  return mcpServerName ? `${mcpServerName}: ${name}` : name;
}

export function planTitleForCurrentTool(task: Pick<PlanTaskInput, 'title' | 'status'>): string {
  const displayName = task.title?.trim() || 'Tool';

  switch (task.status) {
    case 'in_progress':
      return `Running ${displayName}…`;

    case 'complete':
      return `Finished ${displayName}`;

    case 'error':
      return `${displayName} failed`;

    default:
      return planTitleForPhase('thinking');
  }
}

export interface PlanTaskInput {
  id: string;
  title?: string;
  status: PlanTaskStatus;
  details?: string;
  group?: string;
}

/** Phase on progress events — never `thinking`, which is inferred internally. */
export type PlanProgressPhase = Exclude<PlanPhase, 'thinking'>;

export type PlanProgressEvent =
  | { kind: 'task'; task: PlanTaskInput }
  | { kind: 'phase'; phase: PlanProgressPhase; title?: string; task?: PlanTaskInput };

export function planTaskIfNamed(
  id: string,
  identity: { title?: string; group?: string },
  status: PlanTaskStatus,
  details?: string
): PlanTaskInput | undefined {
  const title = identity.title?.trim();
  if (!title) {
    return undefined;
  }

  return {
    id,
    title,
    status,
    group: identity.group,
    ...(details ? { details } : {}),
  };
}
