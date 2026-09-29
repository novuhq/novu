import { DIRECT } from '../config.ts';

export type PendingChoice = {
  requestId: string;
  /** The user message to forward once an option is picked. */
  text: string;
  /** Choice option id (`a1`, `a2`, ...) to local agent id or `direct`. */
  options: Record<string, string>;
};

export type RouteState = {
  current?: string;
  /** Agent that asked the user a question; the next message goes straight to it. */
  waiting?: string;
  /** Local agent id to Gemini Enterprise session name. */
  sessions: Record<string, string>;
  /** Last user message that was forwarded, re-sent by "Change agent". */
  lastForwarded?: string;
  pending?: PendingChoice;
};

export type Scores =
  | { source: 'jev'; probabilities: Record<string, number>; choice?: string; confidence?: number }
  | { source: 'gemini'; choice: string; confidence: 'high' | 'medium' | 'low' };

export type Decision =
  | { action: 'forward'; agentId: string; rule: string; switched: boolean }
  | { action: 'direct'; rule: string }
  | { action: 'choose'; candidates: string[]; rule: string };

export const FORWARD_THRESHOLD = 0.7;
export const DIRECT_THRESHOLD = 0.6;
const MAX_CARD_CANDIDATES = 3;
const MIN_THIRD_CANDIDATE = 0.1;

export function readRouteState(value: unknown): RouteState {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<RouteState>;

  return {
    ...raw,
    sessions: raw.sessions && typeof raw.sessions === 'object' ? { ...raw.sessions } : {},
  };
}

/** Rule 1: an agent waiting for an answer gets the message without classification. */
export function decideBeforeClassify(state: RouteState, agentIds: string[]): Decision | undefined {
  if (state.waiting && agentIds.includes(state.waiting)) {
    return { action: 'forward', agentId: state.waiting, rule: 'waiting', switched: state.waiting !== state.current };
  }

  return undefined;
}

export function decideFromScores(state: RouteState, scores: Scores, agentIds: string[]): Decision {
  if (scores.source === 'jev') {
    const ranked = agentIds
      .map((id) => ({ id, p: scores.probabilities[id] ?? 0 }))
      .sort((a, b) => b.p - a.p);
    const top = ranked[0];
    if (top && top.p >= FORWARD_THRESHOLD) {
      return { action: 'forward', agentId: top.id, rule: 'jev_top_agent', switched: top.id !== state.current };
    }
    if ((scores.probabilities[DIRECT] ?? 0) >= DIRECT_THRESHOLD) return { action: 'direct', rule: 'jev_direct' };

    const candidates = ranked
      .slice(0, MAX_CARD_CANDIDATES)
      .filter((entry, index) => index < 2 || entry.p >= MIN_THIRD_CANDIDATE)
      .map((entry) => entry.id);

    return { action: 'choose', candidates, rule: 'jev_uncertain' };
  }

  if (scores.confidence === 'high') {
    if (scores.choice === DIRECT) return { action: 'direct', rule: 'gemini_direct' };
    if (agentIds.includes(scores.choice)) {
      return { action: 'forward', agentId: scores.choice, rule: 'gemini_high', switched: scores.choice !== state.current };
    }
  }

  const first = agentIds.includes(scores.choice) ? [scores.choice] : [];
  const candidates = [...first, ...agentIds.filter((id) => id !== scores.choice)].slice(0, MAX_CARD_CANDIDATES);

  return { action: 'choose', candidates, rule: 'gemini_not_high' };
}

type HistoryEntry = { role: string; type: string; content: string };

/** Last 3 user messages and the last agent reply, each truncated (about 600 tokens in total). */
export function recentHistory(history: HistoryEntry[], currentText: string): string[] {
  const messages = history.filter((entry) => entry.type === 'message' && entry.content?.trim());
  const last = messages.at(-1);
  if (last && last.role === 'user' && last.content.trim() === currentText.trim()) messages.pop();

  const users = messages.filter((entry) => entry.role === 'user').slice(-3);
  const reply = messages.filter((entry) => entry.role === 'assistant').at(-1);

  return [
    ...users.map((entry) => `User: ${truncate(entry.content, 400)}`),
    ...(reply ? [`Last agent reply: ${truncate(reply.content, 800)}`] : []),
  ];
}

export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();

  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}
