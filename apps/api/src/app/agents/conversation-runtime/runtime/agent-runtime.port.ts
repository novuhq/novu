import type { ConversationTurn } from './conversation-turn';

export interface AgentRuntime {
  dispatch(turn: ConversationTurn): Promise<void>;
}
