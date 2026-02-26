import { Injectable, NotFoundException } from '@nestjs/common';
import { AiChatEntity, AiChatRepository } from '@novu/dal';
import { GetChatCommand } from './get-chat.command';

@Injectable()
export class GetChatUseCase {
  constructor(private readonly aiChatRepository: AiChatRepository) {}

  async execute(command: GetChatCommand): Promise<AiChatEntity> {
    const { user, id } = command;

    const chat = await this.aiChatRepository.findOne({
      _id: id,
      _environmentId: user.environmentId,
      _organizationId: user.organizationId,
      _userId: user._id,
    });

    if (!chat) {
      throw new NotFoundException(`Chat with id ${id} not found`);
    }

    return chat;
  }
}
