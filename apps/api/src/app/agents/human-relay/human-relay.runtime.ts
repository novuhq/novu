import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import type { AgentRuntime } from '../conversation-runtime/runtime/agent-runtime.port';
import type { ConversationTurn } from '../conversation-runtime/runtime/conversation-turn';
import { AgentEventEnum } from '../shared/enums/agent-event.enum';
import { ContactHandleService } from './contact-handle.service';
import { HumanInteractionInboundService } from './human-interaction-inbound.service';

/**
 * The "no brain" runtime behind `runtime: 'human_relay'` agents. Inbound
 * events on the relay's channels never reach a bridge or a managed agent —
 * they resolve pending human interactions created via `/v1/human/interactions`.
 * Each message and button press also refreshes how the person shows on that
 * app, for their contact card.
 */
@Injectable()
export class HumanRelayRuntime implements AgentRuntime {
  constructor(
    private readonly inbound: HumanInteractionInboundService,
    private readonly contactHandles: ContactHandleService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async dispatch(turn: ConversationTurn): Promise<void> {
    if (turn.event === AgentEventEnum.ON_ACTION) {
      await Promise.all([this.inbound.tryHandleAction(turn, 'relay'), this.contactHandles.refreshFromTurn(turn)]);

      return;
    }

    if (turn.event === AgentEventEnum.ON_MESSAGE) {
      await Promise.all([this.inbound.tryHandleMessage(turn, 'relay'), this.contactHandles.refreshFromTurn(turn)]);
    }
  }
}
