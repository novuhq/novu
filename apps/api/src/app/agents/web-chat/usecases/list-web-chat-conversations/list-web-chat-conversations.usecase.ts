import { BadRequestException, Injectable } from '@nestjs/common';
import { AgentRepository, ConversationEntity, ConversationRepository } from '@novu/dal';
import { AgentPlatformEnum } from '../../../shared/enums/agent-platform.enum';
import type { WebChatConversationMetadataDto } from '../../dtos/web-chat-conversation.dto';
import { ListWebChatConversationsCommand } from './list-web-chat-conversations.command';

type ListResult = {
  data: WebChatConversationMetadataDto[];
  next: string | null;
  previous: string | null;
  totalCount: number;
  totalCountCapped: boolean;
};

@Injectable()
export class ListWebChatConversations {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly agentRepository: AgentRepository
  ) {}

  async execute(command: ListWebChatConversationsCommand): Promise<ListResult> {
    if (command.after && command.before) {
      throw new BadRequestException('Cannot specify both "before" and "after" cursors at the same time.');
    }

    const page = await this.conversationRepository.listConversations({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      subscriberId: command.subscriberId,
      provider: [AgentPlatformEnum.WEB_CHAT],
      after: command.after,
      before: command.before,
      limit: command.limit,
      sortBy: 'lastActivityAt',
      sortDirection: -1,
    });

    const agentIdentifierById = await this.resolveAgentIdentifiers(
      command.environmentId,
      page.data.map((conversation) => conversation._agentId)
    );

    return {
      data: page.data
        .map((conversation) => this.toMetadata(conversation, agentIdentifierById.get(conversation._agentId)))
        .filter((item): item is WebChatConversationMetadataDto => item !== null),
      next: page.next,
      previous: page.previous,
      totalCount: page.totalCount,
      totalCountCapped: page.totalCountCapped,
    };
  }

  private async resolveAgentIdentifiers(environmentId: string, agentIds: string[]): Promise<Map<string, string>> {
    const uniqueIds = [...new Set(agentIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return new Map();
    }

    const agents = await this.agentRepository.find({ _id: { $in: uniqueIds }, _environmentId: environmentId }, [
      '_id',
      'identifier',
    ]);

    return new Map(agents.map((agent) => [agent._id, agent.identifier]));
  }

  private toMetadata(
    conversation: ConversationEntity,
    agentIdentifier: string | undefined
  ): WebChatConversationMetadataDto | null {
    if (!agentIdentifier) {
      return null;
    }

    return {
      identifier: conversation.identifier,
      title: conversation.title,
      status: conversation.status,
      agentIdentifier,
      lastActivityAt: conversation.lastActivityAt,
      createdAt: conversation.createdAt,
    };
  }
}
