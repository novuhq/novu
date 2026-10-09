import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { ConversationStatusEnum } from '@novu/dal';
import { AgentConversationService } from '../../../agents/conversation-runtime/conversation/agent-conversation.service';
import type { InboxThreadDto } from '../../dtos/human-inbox.dto';
import { HumanInboxService } from '../../services/human-inbox.service';
import { InboxThreadCommand } from '../inbox-thread.command';

/** Closes the thread. A new message from the human reopens it with its history. */
@Injectable()
export class ResolveInboxThread {
  constructor(
    private readonly inbox: HumanInboxService,
    private readonly conversationService: AgentConversationService
  ) {}

  @InstrumentUsecase()
  async execute(command: InboxThreadCommand): Promise<InboxThreadDto> {
    const scope = { environmentId: command.environmentId, organizationId: command.organizationId };
    const agent = await this.inbox.resolveRelayAgent(scope, command.agentIdentifier);
    const conversation = await this.inbox.findThread(scope, agent, command.identifier);

    if (conversation.status !== ConversationStatusEnum.RESOLVED) {
      await this.conversationService.resolveConversation({
        ...scope,
        conversationId: conversation._id,
        channel: this.inbox.primaryChannel(conversation),
        agentIdentifier: agent.identifier,
      });
      conversation.status = ConversationStatusEnum.RESOLVED;
    }

    await this.inbox.markRead(scope, conversation);

    return this.inbox.toThread(scope, conversation);
  }
}
