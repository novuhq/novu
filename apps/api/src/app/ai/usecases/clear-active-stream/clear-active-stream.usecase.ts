import { Injectable } from '@nestjs/common';
import { AiChatRepository } from '@novu/dal';
import { ClearActiveStreamCommand } from './clear-active-stream.command';

@Injectable()
export class ClearActiveStreamUseCase {
  constructor(private readonly aiChatRepository: AiChatRepository) {}

  async execute(command: ClearActiveStreamCommand): Promise<void> {
    await this.aiChatRepository.clearActiveStream(
      command.chatId,
      command.user.environmentId,
      command.user.organizationId,
      command.streamId
    );
  }
}
