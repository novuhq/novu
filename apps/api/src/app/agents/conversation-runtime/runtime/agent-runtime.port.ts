import type { ConversationTurn } from './conversation-turn';

export type CancelRunParams = {
  conversation: ConversationTurn['conversation'];
  config: ConversationTurn['config'];
  runId: string;
};

export interface AgentRuntime {
  dispatch(turn: ConversationTurn): Promise<void>;
  cancelRun(params: CancelRunParams): Promise<void>;
}
