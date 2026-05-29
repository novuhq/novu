import type { AgentAction } from '@novu/framework';
import type { BridgeReaction } from './bridge-executor.service';
import type { ConversationTurn } from './conversation-turn';

export interface AgentRuntime {
  dispatchTurn(turn: ConversationTurn): Promise<void>;
  handleAction(turn: ConversationTurn, action: AgentAction): Promise<void>;
  handleReaction(turn: ConversationTurn, reaction: BridgeReaction): Promise<void>;
}
