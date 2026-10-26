import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { OutboundGateway } from '../../../agents/conversation-runtime/egress/outbound.gateway';
import {
  type AgentPlatformEnum,
  PLATFORMS_WITH_TYPING_INDICATOR,
} from '../../../agents/shared/enums/agent-platform.enum';
import type { WakeTypingResponseDto } from '../../dtos/human-wake.dto';
import { HumanInboxService } from '../../services/human-inbox.service';
import { HumanWakeLeaseService } from '../../services/human-wake-lease.service';
import { ShowWakeTypingCommand } from './show-wake-typing.command';

/**
 * While a woken host works on a message, the chat shows that a reply is coming. A chat's typing indicator lasts
 * only a few seconds (Telegram's five), so the wake program asks again every few for as long as the host works.
 * Only the computer and host holding the lease may, in a conversation of its agent, where the chat has typing.
 */
@Injectable()
export class ShowWakeTyping {
  constructor(
    private readonly inbox: HumanInboxService,
    private readonly lease: HumanWakeLeaseService,
    private readonly outboundGateway: OutboundGateway
  ) {}

  @InstrumentUsecase()
  async execute(command: ShowWakeTypingCommand): Promise<WakeTypingResponseDto> {
    const scope = { environmentId: command.environmentId, organizationId: command.organizationId };
    const agent = await this.inbox.resolveRelayAgent(scope, command.agentIdentifier);
    await this.lease.assertHolds(scope, agent, { computerId: command.computerId, host: command.host });
    const conversation = await this.inbox.findThread(scope, agent, command.conversationId);
    const channel = this.inbox.primaryChannel(conversation);
    if (!PLATFORMS_WITH_TYPING_INDICATOR.has(channel.platform as AgentPlatformEnum)) {
      return { typing: false };
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
