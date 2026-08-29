import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import type { AgentRuntime } from '../conversation-runtime/runtime/agent-runtime.port';
import type { ConversationTurn } from '../conversation-runtime/runtime/conversation-turn';
import { AgentEventEnum } from '../shared/enums/agent-event.enum';
import { HumanInteractionInboundService } from './human-interaction-inbound.service';

/**
 * The "no brain" runtime behind `runtime: 'human_relay'` agents. Inbound
 * events on the relay's channels never reach a bridge or a managed agent —
 * they resolve pending human interactions created via `/v1/human/interactions`.
 */
@Injectable()
export class HumanRelayRuntime implements AgentRuntime {
  constructor(
    private readonly inbound: HumanInteractionInboundService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async dispatch(turn: ConversationTurn): Promise<void> {
    if (turn.event === AgentEventEnum.ON_ACTION) {
      await this.inbound.tryHandleAction(turn, 'relay');

      return;
    }

    if (turn.event === AgentEventEnum.ON_MESSAGE) {
      await this.inbound.tryHandleMessage(turn, 'relay');
    }
  }
}
