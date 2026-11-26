/**
 * What a Copilot link or an "Ask Copilot" row action leaves for the Copilot the navigation it starts mounts: the
 * conversation to continue there and the text for its composer. The Copilot opens with it.
 */
export type CopilotHandoff = {
  /** Absent keeps that page's own thread. */
  conversationId?: string;
  prefill?: string;
  createdAt: number;
};

const HANDOFF_STORAGE_KEY = 'novu-copilot-handoff';

/** Long enough for the workflow editor to resolve its Copilot after the navigation, short enough that a later visit doesn't inherit it. */
export const COPILOT_HANDOFF_TTL_MS = 60_000;

type HandoffStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const getSessionStorage = (): HandoffStorage => window.sessionStorage;

export function writeCopilotHandoff(
  handoff: Omit<CopilotHandoff, 'createdAt'>,
  { now = Date.now(), getStorage = getSessionStorage }: { now?: number; getStorage?: () => HandoffStorage } = {}
): void {
  try {
    getStorage().setItem(HANDOFF_STORAGE_KEY, JSON.stringify({ ...handoff, createdAt: now }));
  } catch {
    // Storage can be unavailable (private mode, blocked site data); the link then opens without the chat.
  }
}

/** The handoff waiting for a Copilot, if it is still fresh. */
export function readCopilotHandoff({
  now = Date.now(),
  getStorage = getSessionStorage,
}: {
  now?: number;
  getStorage?: () => HandoffStorage;
} = {}): CopilotHandoff | undefined {
  try {
    const raw = getStorage().getItem(HANDOFF_STORAGE_KEY);
    if (!raw) return undefined;

    const parsed: Partial<CopilotHandoff> | null = JSON.parse(raw);
    if (typeof parsed?.createdAt !== 'number' || now - parsed.createdAt > COPILOT_HANDOFF_TTL_MS) return undefined;

    return {
      createdAt: parsed.createdAt,
      ...(typeof parsed.conversationId === 'string' && parsed.conversationId
        ? { conversationId: parsed.conversationId }
        : {}),
      ...(typeof parsed.prefill === 'string' && parsed.prefill ? { prefill: parsed.prefill } : {}),
    };
  } catch {
    return undefined;
  }
}

/** Drops `handoff` once a Copilot took it, unless a newer one replaced it meanwhile. */
export function clearCopilotHandoff(
  handoff: CopilotHandoff,
  { getStorage = getSessionStorage }: { getStorage?: () => HandoffStorage } = {}
): void {
  try {
    const raw = getStorage().getItem(HANDOFF_STORAGE_KEY);
    const stored: Partial<CopilotHandoff> | null = raw ? JSON.parse(raw) : null;
    if (stored?.createdAt === handoff.createdAt) getStorage().removeItem(HANDOFF_STORAGE_KEY);
  } catch {
    // Unreadable storage holds nothing to clear.
  }
}
