import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AgentRepository, ConversationChannel, ConversationEntity } from '@novu/dal';
import {
  AgentPlatformEnum,
  PLATFORMS_WITH_INTERIM_EDITS,
  PLATFORMS_WITH_TYPING_INDICATOR,
} from '../../dtos/agent-platform.enum';
import { ReplyContentDto } from '../../dtos/agent-reply-payload.dto';
import { AgentConversationService } from '../../services/agent-conversation.service';
import { AgentProgressRenderer, ChatSdkService } from '../../services/chat-sdk.service';
import { UpdateAgentStatusCommand } from './update-agent-status.command';

export type UpdateAgentStatusResult = {
  success: boolean;
  messageId?: string;
  platformThreadId?: string;
  progressRenderer?: AgentProgressRenderer;
};

@Injectable()
export class UpdateAgentStatus {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentConversationService: AgentConversationService,
    private readonly chatSdkService: ChatSdkService
  ) {}

  async execute(command: UpdateAgentStatusCommand): Promise<UpdateAgentStatusResult> {
    const conversation = await this.agentConversationService.getConversation(
      command.conversationId,
      command.environmentId,
      command.organizationId
    );
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.assertAgentMatchesConversation(command, conversation);

    const channel = this.agentConversationService.getPrimaryChannel(conversation);
    this.ensureSerializedThread(channel);
    const platform = channel.platform as AgentPlatformEnum;
    const platformThreadId = this.resolveStatusThreadId(command.platformThreadId, channel);

    if (command.state === 'typing') {
      if (PLATFORMS_WITH_TYPING_INDICATOR.has(platform)) {
        await this.chatSdkService.refreshTyping(
          conversation._agentId,
          command.integrationIdentifier,
          channel.platform,
          channel.serializedThread,
          this.formatTypingLabel(command)
        );
      }

      return {
        success: true,
        messageId: command.messageId,
        platformThreadId,
      };
    }

    if (!PLATFORMS_WITH_INTERIM_EDITS.has(platform)) {
      return { success: true, messageId: command.messageId, platformThreadId };
    }

    const content: ReplyContentDto = { markdown: this.formatStatusMarkdown(command) };

    if (!command.messageId) {
      const sent = await this.chatSdkService.postProgress({
        agentId: conversation._agentId,
        integrationIdentifier: command.integrationIdentifier,
        platform: channel.platform,
        platformThreadId,
        serializedThread: channel.serializedThread,
        content,
        progressTasks: command.progressTasks,
        preferredRenderer: command.progressRenderer,
      });

      return {
        success: true,
        messageId: sent.messageId,
        platformThreadId,
        progressRenderer: sent.progressRenderer,
      };
    }

    const edited = await this.chatSdkService.updateProgress({
      agentId: conversation._agentId,
      integrationIdentifier: command.integrationIdentifier,
      platform: channel.platform,
      platformThreadId,
      platformMessageId: command.messageId,
      content,
      progressRenderer: command.progressRenderer,
      progressTasks: command.progressTasks,
    });

    return {
      success: true,
      messageId: edited.messageId,
      platformThreadId,
      progressRenderer: edited.progressRenderer,
    };
  }

  private resolveStatusThreadId(platformThreadId: string | undefined, channel: ConversationChannel): string {
    if (platformThreadId && platformThreadId !== channel.platformThreadId) {
      throw new ForbiddenException('Message thread does not match this conversation');
    }

    return channel.platformThreadId;
  }

  private ensureSerializedThread(
    channel: ConversationChannel
  ): asserts channel is ConversationChannel & { serializedThread: Record<string, unknown> } {
    if (!channel.serializedThread) {
      throw new BadRequestException('Conversation has no serialized thread - unable to update status');
    }
  }

  private async assertAgentMatchesConversation(
    command: UpdateAgentStatusCommand,
    conversation: ConversationEntity
  ): Promise<void> {
    const agent = await this.agentRepository.findOne(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        identifier: command.agentIdentifier,
      },
      { _id: 1 }
    );

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    if (String(agent._id) !== conversation._agentId) {
      throw new ForbiddenException('Agent identifier does not match this conversation');
    }
  }

  private formatTypingLabel(command: UpdateAgentStatusCommand): string {
    if (command.state === 'tool_use' && command.toolName) {
      return `Using ${command.toolName}...`;
    }

    return 'Thinking...';
  }

  private formatStatusMarkdown(command: UpdateAgentStatusCommand): string {
    switch (command.state) {
      case 'tool_use':
        return command.toolName ? `_Using tool: \`${command.toolName}\`_` : '_Using a tool..._';
      case 'tool_result':
        return '_Got result, continuing..._';
      case 'compacting':
        return '_Optimizing context..._';
      case 'retrying':
        return '_Anthropic retrying - please hold..._';
      case 'error':
        return '_The agent hit an error and is recovering..._';
      default:
        return '_Thinking..._';
    }
  }
}
