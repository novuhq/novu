import { Injectable } from '@nestjs/common';
import { AiChatRepository } from '@novu/dal';
import { CancelStreamCommand } from './cancel-stream.command';

@Injectable()
export class CancelStreamUseCase {
  constructor(private readonly aiChatRepository: AiChatRepository) {}

  async execute(command: CancelStreamCommand): Promise<void> {
    await this.aiChatRepository.clearActiveStreamForChat(
      command.chatId,
      command.user.environmentId,
      command.user.organizationId
    );
  }
}
