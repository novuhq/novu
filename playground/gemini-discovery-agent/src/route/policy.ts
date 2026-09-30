import { DIRECT } from '../config.ts';

export type RouteState = {
  current?: string;
  /** Local agent id to Gemini Enterprise session name. */
  sessions: Record<string, string>;
};

export type Scores = { choice: string; confidence: 'high' | 'medium' | 'low' };

export type Decision =
  | { action: 'forward'; agentId: string; rule: string; switched: boolean }
  | { action: 'direct'; rule: string };

export function readRouteState(value: unknown): RouteState {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<RouteState>;

  return {
    ...raw,
    sessions: raw.sessions && typeof raw.sessions === 'object' ? { ...raw.sessions } : {},
  };
}

/** Unsure routes get a direct answer, which asks the user in plain text which agent they mean. */
export function decideFromScores(state: RouteState, scores: Scores, agentIds: string[]): Decision {
  if (scores.confidence === 'high' && scores.choice !== DIRECT && agentIds.includes(scores.choice)) {
    return { action: 'forward', agentId: scores.choice, rule: 'gemini_high', switched: scores.choice !== state.current };
  }

  return { action: 'direct', rule: scores.choice === DIRECT ? 'gemini_direct' : 'gemini_not_high' };
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
