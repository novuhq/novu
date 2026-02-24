import { Injectable } from '@nestjs/common';
import { AiChatEntity, AiChatRepository } from '@novu/dal';
import { GetLatestChatCommand } from './get-latest-chat.command';

@Injectable()
export class GetLatestChatUseCase {
  constructor(private readonly aiChatRepository: AiChatRepository) {}

  async execute(command: GetLatestChatCommand): Promise<AiChatEntity | null> {
    const { user, resourceType, resourceId } = command;

    return this.aiChatRepository.findLatestByResource(
      user.environmentId,
      user.organizationId,
      user._id,
      resourceType,
      resourceId
    );
  }
}
