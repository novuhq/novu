import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { OutboundGateway } from '../../../agents/conversation-runtime/egress/outbound.gateway';
import {
  type AgentPlatformEnum,
  PLATFORMS_WITH_TYPING_INDICATOR,
} from '../../../agents/shared/enums/agent-platform.enum';
import type { ListenTypingResponseDto } from '../../dtos/human-listen.dto';
import { HumanInboxService } from '../../services/human-inbox.service';
import { HumanListenLeaseService } from '../../services/human-listen-lease.service';
import { HumanListenMessagesService } from '../../services/human-listen-messages.service';
import { ShowListenTypingCommand } from './show-listen-typing.command';

/**
 * While a started host works on an answer the person is waiting for, the chat shows that a reply is coming. An
 * inbound message is answered later, from the inbox, so it does not. A chat's typing indicator lasts only a few
 * seconds (Telegram's five), so the listener asks again every few for as long as the host works. Only the computer
 * and host holding the lease may, in a conversation of its agent, where the chat has typing.
 */
@Injectable()
export class ShowListenTyping {
  constructor(
    private readonly inbox: HumanInboxService,
    private readonly lease: HumanListenLeaseService,
    private readonly messages: HumanListenMessagesService,
    private readonly outboundGateway: OutboundGateway
  ) {}

  @InstrumentUsecase()
  async execute(command: ShowListenTypingCommand): Promise<ListenTypingResponseDto> {
    const scope = { environmentId: command.environmentId, organizationId: command.organizationId };
    const agent = await this.inbox.resolveRelayAgent(scope, command.agentIdentifier);
    await this.lease.assertHolds(scope, agent, { computerId: command.computerId, host: command.host });
    const conversation = await this.inbox.findThread(scope, agent, command.conversationId);
    const channel = this.inbox.primaryChannel(conversation);
    if (!PLATFORMS_WITH_TYPING_INDICATOR.has(channel.platform as AgentPlatformEnum)) {
      return { typing: false };
    }

    // False would tell the listener this chat has no typing, and it would not ask again. An inbound message shows
    // nothing now; an answer that becomes the newest thing still can, the next time it asks.
    if (!(await this.messages.newestIsAnswer(scope, agent, conversation._id))) {
      return { typing: true };
    }

    const integrationIdentifier = await this.inbox.resolveIntegrationIdentifier(scope, channel);
    // A platform that refuses is only logged by the gateway: typing is a courtesy, not worth failing over.
    await this.outboundGateway.startTypingInConversation(
      agent._id,
      integrationIdentifier,
      channel.platformThreadId,
      undefined,
      channel.workspace?.id
    );

    return { typing: true };
  }
}
