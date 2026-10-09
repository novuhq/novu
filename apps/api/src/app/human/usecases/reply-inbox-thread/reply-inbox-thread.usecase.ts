import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { OutboundGateway } from '../../../agents/conversation-runtime/egress/outbound.gateway';
import type { ReplyInboxThreadResponseDto } from '../../dtos/human-inbox.dto';
import { HumanInboxService } from '../../services/human-inbox.service';
import { ReplyInboxThreadCommand } from './reply-inbox-thread.command';

/** Posts text into the thread on the channel it came from, recorded as the relay agent's message. */
@Injectable()
export class ReplyInboxThread {
  constructor(
    private readonly inbox: HumanInboxService,
    private readonly outboundGateway: OutboundGateway
  ) {}

  @InstrumentUsecase()
  async execute(command: ReplyInboxThreadCommand): Promise<ReplyInboxThreadResponseDto> {
    const scope = { environmentId: command.environmentId, organizationId: command.organizationId };
    const agent = await this.inbox.resolveRelayAgent(scope, command.agentIdentifier);
    const conversation = await this.inbox.findThread(scope, agent, command.identifier);
    const channel = this.inbox.primaryChannel(conversation);
    const integrationIdentifier = await this.inbox.resolveIntegrationIdentifier(scope, channel);

    const sent = await this.outboundGateway.deliver(
      {
        agentId: agent._id,
        integrationIdentifier,
        platform: channel.platform,
        platformThreadId: channel.platformThreadId,
        workspaceId: channel.workspace?.id,
      },
      { markdown: command.text },
      {
        conversationId: conversation._id,
        channel,
        agentIdentifier: agent.identifier,
        agentName: agent.name,
        ...scope,
      }
    );

    await this.inbox.markRead(scope, conversation);

    return { thread: await this.inbox.toThread(scope, conversation), messageId: sent.messageId };
  }
}
