import { Injectable } from '@nestjs/common';
import { parseNovuHumanRequestId, parseToolApprovalRequestId } from '@novu/shared';
import type { ConversationTurn } from '../conversation-runtime/runtime/conversation-turn';
import { HumanInteractionInboundService } from './human-interaction-inbound.service';
import { toAgentHumanResponse } from './to-agent-human-response';

/**
 * Conversation-mode HITL intercept for bridge/managed agents. `human_relay`
 * is skipped — that runtime owns settlement so the same click/reply is not
 * handled twice.
 *
 * Returns `true` when the original turn was consumed and must not dispatch.
 * A settled interaction attaches `turn.humanResponse` and returns `false`
 * so the agent continues with `ctx.humanResponse` set. Managed `novu_human`
 * settlements resume the parked session in the settlement service and consume
 * the turn so we do not send a second user message into the parked session.
 */
@Injectable()
export class HumanConversationInboundInterceptor {
  constructor(private readonly inbound: HumanInteractionInboundService) {}

  async tryHandleMessage(turn: ConversationTurn): Promise<boolean> {
    if (turn.agent.runtime === 'human_relay') {
      return false;
    }

    return this.attachOrConsume(() => this.inbound.tryHandleMessage(turn, 'conversation'), turn);
  }

  async tryHandleAction(turn: ConversationTurn): Promise<boolean> {
    if (turn.agent.runtime === 'human_relay') {
      return false;
    }

    return this.attachOrConsume(() => this.inbound.tryHandleAction(turn, 'conversation'), turn);
  }

  private async attachOrConsume(
    handle: () => ReturnType<HumanInteractionInboundService['tryHandleMessage']>,
    turn: ConversationTurn
  ): Promise<boolean> {
    const result = await handle();

    if (result.outcome === 'settled') {
      turn.humanResponse = toAgentHumanResponse(result.settled);

      if (parseNovuHumanRequestId(result.settled.requestId) !== null) {
        return true;
      }

      const settledToolApproval = parseToolApprovalRequestId(result.settled.requestId) !== null;
      if (settledToolApproval) {
        turn.toolApprovalSettledByHitl = true;
      }

      return settledToolApproval && turn.agent.runtime === 'managed';
    }

    return result.outcome === 'consumed';
  }
}
