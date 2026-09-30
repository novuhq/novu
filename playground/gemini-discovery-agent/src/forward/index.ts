import type { TargetAgent } from '../config.ts';
import { askA2aProxy } from './a2a-proxy.ts';
import { askStreamAssist } from './stream-assist.ts';

export type AgentReply = {
  /** The agent's answer or question; undefined when it wants input we can't read. */
  text?: string;
  /** Gemini Enterprise session; pass it back on the next message to continue the conversation. */
  session: string;
};

export function forward(target: TargetAgent, text: string, session: string | undefined): Promise<AgentReply> {
  return target.path === 'a2a_proxy'
    ? askA2aProxy(target.targetId, text, session)
    : askStreamAssist(target.targetId, text, session);
}
