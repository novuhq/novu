import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { AiChatRepository, SnapshotRepository } from '@novu/dal';
import { GetChatCommand, GetChatUseCase } from '../get-chat';
import { UpsertChatCommand, UpsertChatUseCase } from '../upsert-chat';
import { RevertMessageCommand } from './revert-message.command';
import { RevertResourceFactory } from './revert-resource.factory';

@Injectable()
export class RevertMessageUseCase {
  constructor(
    private readonly logger: PinoLogger,
    private readonly snapshotRepository: SnapshotRepository,
    private readonly aiChatRepository: AiChatRepository,
    private readonly getChatUseCase: GetChatUseCase,
    private readonly upsertChatUseCase: UpsertChatUseCase,
    private readonly revertResourceFactory: RevertResourceFactory
  ) {}

  async execute(command: RevertMessageCommand): Promise<void> {
    const chat = await this.getChatUseCase.execute(GetChatCommand.create({ id: command.chatId, user: command.user }));

    const refs = chat.snapshots ?? [];
    const snapshotsForMessage = refs.filter((r) => r.messageId === command.messageId);
    if (snapshotsForMessage.length === 0) {
      throw new NotFoundException('No snapshots found for this message');
    }

    const latestSnapshotId = snapshotsForMessage[snapshotsForMessage.length - 1]._snapshotId;
    const latestCheckpointId = snapshotsForMessage[snapshotsForMessage.length - 1].checkpointId;
    const latestSnapshot = await this.snapshotRepository.findOne({
      _id: latestSnapshotId,
      _environmentId: command.user.environmentId,
    });
    if (!latestSnapshot) {
      throw new NotFoundException('Snapshot documents not found');
    }

    const allMessages = (chat.messages as Array<{ id: string }>) ?? [];
    const messageIndex = allMessages.findIndex((m) => m.id === command.messageId);
    if (messageIndex === -1) {
      throw new NotFoundException('Message not found in chat');
    }

    const messagesAfterRevert = allMessages.slice(messageIndex + 1);
    const messageIdsAfterRevert = new Set(messagesAfterRevert.map((m) => m.id));
    const snapshotsToDelete = refs.filter((r) => messageIdsAfterRevert.has(r.messageId));
    const snapshotIdsToDelete = snapshotsToDelete.map((r) => r._snapshotId);

    await this.snapshotRepository.withTransaction(async (session) => {
      const strategy = this.revertResourceFactory.getStrategy(latestSnapshot.resourceType);
      await strategy.revert(latestSnapshot, command.user);

      const truncatedMessages = allMessages.slice(0, messageIndex + 1); // include the user message
      await this.upsertChatUseCase.execute(
        UpsertChatCommand.create({
          id: command.chatId,
          messages: truncatedMessages,
          user: command.user,
          session,
        })
      );

      await this.aiChatRepository.update(
        {
          _id: command.chatId,
          _environmentId: command.user.environmentId,
          _organizationId: command.user.organizationId,
        },
        { $set: { resumeCheckpointId: latestCheckpointId, hasPendingChanges: false } },
        { session }
      );

      await this.snapshotRepository.deleteSnapshots(command.user.environmentId, snapshotIdsToDelete, { session });
      await this.aiChatRepository.pullSnapshotRefs(command.user.environmentId, command.chatId, snapshotIdsToDelete, {
        session,
      });
    });

    this.logger.info(
      { chatId: command.chatId, messageId: command.messageId, count: snapshotIdsToDelete.length },
      'AI message reverted'
    );
  }
}
