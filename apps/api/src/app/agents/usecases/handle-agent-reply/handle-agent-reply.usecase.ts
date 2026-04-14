import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { GetDecryptedSecretKey, GetDecryptedSecretKeyCommand, shortId } from '@novu/application-generic';
import {
  ConversationActivityRepository,
  ConversationActivityTypeEnum,
  ConversationEntity,
  ConversationRepository,
  ConversationStatusEnum,
} from '@novu/dal';
import jwt from 'jsonwebtoken';
import { BridgeExecutorService, ReplyTokenClaims } from '../../services/bridge-executor.service';
import { ChatSdkService } from '../../services/chat-sdk.service';
import { HandleAgentReplyCommand, Signal } from './handle-agent-reply.command';

@Injectable()
export class HandleAgentReply {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly activityRepository: ConversationActivityRepository,
    private readonly chatSdkService: ChatSdkService,
    private readonly bridgeExecutor: BridgeExecutorService,
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

    if (command.signals?.length) {
      await this.executeSignals(claims, conversation, command.signals);
    }

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

  private async executeSignals(
    claims: ReplyTokenClaims,
    conversation: ConversationEntity,
    signals: Signal[]
  ): Promise<void> {
    const metadataSignals = signals.filter((s): s is Extract<Signal, { type: 'metadata' }> => s.type === 'metadata');

    if (metadataSignals.length) {
      await this.executeMetadataSignals(claims, conversation, metadataSignals);
    }

    const triggerSignals = signals.filter((s) => s.type === 'trigger');
    if (triggerSignals.length) {
      // TODO: execute trigger signals — requires wiring TriggerEvent or ParseEventRequest from EventsModule
    }

    const resolveSignals = signals.filter((s): s is Extract<Signal, { type: 'resolve' }> => s.type === 'resolve');
    if (resolveSignals.length) {
      await this.executeResolveSignal(claims, conversation, resolveSignals[0]);
    }
  }

  private async executeMetadataSignals(
    claims: ReplyTokenClaims,
    conversation: ConversationEntity,
    signals: Array<{ type: 'metadata'; key: string; value: unknown }>
  ): Promise<void> {
    const merged = { ...(conversation.metadata ?? {}) };
    for (const signal of signals) {
      merged[signal.key] = signal.value;
    }

    const serialized = JSON.stringify(merged);
    if (Buffer.byteLength(serialized) > 65_536) {
      throw new BadRequestException('Conversation metadata exceeds 64KB limit');
    }

    await Promise.all([
      this.conversationRepository.updateMetadata(
        claims.environmentId,
        claims.organizationId,
        conversation._id,
        merged
      ),
      this.activityRepository.createSignalActivity({
        identifier: `act-${shortId(8)}`,
        conversationId: conversation._id,
        platform: conversation.channels[0].platform,
        integrationId: conversation.channels[0]._integrationId,
        platformThreadId: conversation.channels[0].platformThreadId,
        agentId: claims.agentId,
        content: `Metadata updated: ${signals.map((s) => s.key).join(', ')}`,
        signalData: { type: 'metadata', payload: merged },
        environmentId: claims.environmentId,
        organizationId: claims.organizationId,
      }),
    ]);
  }

  private async executeResolveSignal(
    claims: ReplyTokenClaims,
    conversation: ConversationEntity,
    signal: { type: 'resolve'; summary?: string }
  ): Promise<void> {
    const channel = conversation.channels[0];

    await Promise.all([
      this.conversationRepository.updateStatus(
        claims.environmentId,
        claims.organizationId,
        conversation._id,
        ConversationStatusEnum.RESOLVED
      ),
      this.activityRepository.createSignalActivity({
        identifier: `act-${shortId(8)}`,
        conversationId: conversation._id,
        platform: channel.platform,
        integrationId: channel._integrationId,
        platformThreadId: channel.platformThreadId,
        agentId: claims.agentId,
        content: signal.summary ?? 'Conversation resolved',
        signalData: { type: 'resolve', payload: signal.summary ? { summary: signal.summary } : undefined },
        environmentId: claims.environmentId,
        organizationId: claims.organizationId,
      }),
    ]);
  }
}
