import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { GetDecryptedSecretKey, GetDecryptedSecretKeyCommand, shortId } from '@novu/application-generic';
import {
  ConversationActivityRepository,
  ConversationActivityTypeEnum,
  ConversationEntity,
  ConversationRepository,
} from '@novu/dal';
import jwt from 'jsonwebtoken';
import { ReplyTokenClaims } from '../../services/bridge-executor.service';
import { ChatSdkService } from '../../services/chat-sdk.service';
import { HandleAgentReplyCommand } from './handle-agent-reply.command';

@Injectable()
export class HandleAgentReply {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly activityRepository: ConversationActivityRepository,
    private readonly chatSdkService: ChatSdkService,
    private readonly getDecryptedSecretKey: GetDecryptedSecretKey
  ) {}

  async execute(command: HandleAgentReplyCommand): Promise<{ status: string }> {
    if (!command.reply && !command.update) {
      throw new BadRequestException('Either reply or update must be provided');
    }
    if (command.reply && command.update) {
      throw new BadRequestException('Only one of reply or update can be provided');
    }

    const claims = await this.validateToken(command.replyToken);

    const conversation = await this.conversationRepository.findOne(
      { _id: claims.conversationId, _environmentId: claims.environmentId, _organizationId: claims.organizationId },
      '*'
    );
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (command.update) {
      await this.deliverMessage(claims, conversation, command.update.text, ConversationActivityTypeEnum.UPDATE);

      return { status: 'update_sent' };
    }

    await this.deliverMessage(claims, conversation, command.reply!.text, ConversationActivityTypeEnum.MESSAGE);

    // TODO Block 6: execute signals here

    return { status: 'ok' };
  }

  private async validateToken(token: string): Promise<ReplyTokenClaims> {
    const claims = jwt.decode(token) as ReplyTokenClaims | null;
    if (!claims?.environmentId || !claims?.organizationId) {
      throw new UnauthorizedException('Invalid reply token');
    }

    const secretKey = await this.getDecryptedSecretKey.execute(
      GetDecryptedSecretKeyCommand.create({ environmentId: claims.environmentId, organizationId: claims.organizationId })
    );

    try {
      return jwt.verify(token, secretKey) as ReplyTokenClaims;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired reply token');
    }
  }

  private async deliverMessage(
    claims: ReplyTokenClaims,
    conversation: ConversationEntity,
    text: string,
    type: ConversationActivityTypeEnum
  ): Promise<void> {
    const channel = conversation.channels[0];
    if (!channel?.serializedThread) {
      throw new BadRequestException('Conversation has no serialized thread — unable to deliver reply');
    }

    await Promise.all([
      this.chatSdkService.postToConversation(
        claims.agentId,
        claims.integrationIdentifier,
        channel.platform,
        channel.serializedThread,
        text
      ),
      this.activityRepository.createAgentActivity({
        identifier: `act-${shortId(8)}`,
        conversationId: conversation._id,
        platform: channel.platform,
        integrationId: channel._integrationId,
        platformThreadId: channel.platformThreadId,
        agentId: claims.agentId,
        content: text,
        type,
        environmentId: claims.environmentId,
        organizationId: claims.organizationId,
      }),
      this.conversationRepository.touchActivity(
        claims.environmentId,
        claims.organizationId,
        conversation._id,
        text
      ),
    ]);
  }
}
