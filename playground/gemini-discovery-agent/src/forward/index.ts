import type { Config, TargetAgent } from '../config.ts';
import { sendToA2aProxy } from './a2a-proxy.ts';
import { sendToStreamAssist } from './stream-assist.ts';

export type ForwardResult =
  /** The agent answered. */
  | { kind: 'answer'; text: string; session: string }
  /** The agent asked the user something (A2A input-required, surfaced by the proxy as a mock tool call). */
  | { kind: 'question'; text: string; session: string }
  /** No text and no known marker: the agent wants input we cannot read. */
  | { kind: 'unreadable'; session: string };

export function forward(config: Config, agent: TargetAgent, text: string, session: string | undefined): Promise<ForwardResult> {
  if (session !== undefined && !session.startsWith(`${config.engine}/sessions/`)) {
    throw new Error(`refusing to reuse session outside ${config.engine}: ${session}`);
  }

  return agent.path === 'a2a_proxy'
    ? sendToA2aProxy(config, agent.targetId, text, session)
    : sendToStreamAssist(config, agent.targetId, text, session);
}
