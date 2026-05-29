import type { ConversationTurn } from './conversation-turn';

/**
 * A runtime owns "what happens to an inbound turn" for one agent kind.
 * The turn itself discriminates message vs action vs reaction (`turn.event`
 * plus the optional `action` / `reaction` fields), so a single entry point
 * covers every inbound shape.
 */
export interface AgentRuntime {
  dispatch(turn: ConversationTurn): Promise<void>;
}
