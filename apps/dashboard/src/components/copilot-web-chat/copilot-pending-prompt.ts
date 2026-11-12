/** A guided-create prompt waiting to be sent as the first message of the workflow it created. */
export type PendingCopilotPrompt = { workflowId: string; text: string };

/** Wait for the Copilot, drop the prompt, leave the composer as it is, or send the prompt. */
export type PendingPromptAction = 'wait' | 'drop' | 'keep' | 'send';

const PENDING_PROMPT_STORAGE_KEY = 'novu-copilot-pending-prompt';

type PromptStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const getSessionStorage = (): PromptStorage => window.sessionStorage;

export function getPendingPromptAction({
  prompt,
  workflowId,
  draft,
  isReady,
  isThreadEmpty,
}: {
  prompt: PendingCopilotPrompt;
  workflowId: string;
  /** The composer text, which holds the prefilled prompt until the user edits or sends it. */
  draft: string;
  isReady: boolean;
  isThreadEmpty: boolean;
}): PendingPromptAction {
  // It never builds onto a workflow it was not written for.
  if (prompt.workflowId !== workflowId) return 'drop';

  if (draft !== prompt.text) return 'keep';

  if (!isReady) return 'wait';

  // A thread with messages may already hold the prompt (sent before a reload or crash), so it is only prefilled.
  return isThreadEmpty ? 'send' : 'keep';
}

/** The router state that carries the prompt is gone after a reload, so a copy is kept for this tab until it is used. */
export function readStoredPendingPrompt(getStorage = getSessionStorage): PendingCopilotPrompt | undefined {
  try {
    const raw = getStorage().getItem(PENDING_PROMPT_STORAGE_KEY);
    if (!raw) return undefined;

    const parsed: Partial<PendingCopilotPrompt> | null = JSON.parse(raw);
    if (typeof parsed?.workflowId !== 'string' || typeof parsed.text !== 'string') return undefined;

    return { workflowId: parsed.workflowId, text: parsed.text };
  } catch {
    return undefined;
  }
}

export function writeStoredPendingPrompt(
  prompt: PendingCopilotPrompt | undefined,
  getStorage = getSessionStorage
): void {
  try {
    if (prompt) getStorage().setItem(PENDING_PROMPT_STORAGE_KEY, JSON.stringify(prompt));
    else getStorage().removeItem(PENDING_PROMPT_STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private mode, blocked site data); the prompt then lives only until a reload.
  }
}
