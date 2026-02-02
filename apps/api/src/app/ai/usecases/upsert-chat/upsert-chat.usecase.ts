import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ResourceValidatorService } from '@novu/application-generic';
import { AiChatEntity, AiChatRepository } from '@novu/dal';
import { AiResourceTypeEnum } from '@novu/shared';
import { UpsertChatCommand } from './upsert-chat.command';

@Injectable()
export class UpsertChatUseCase {
  constructor(
    private readonly aiChatRepository: AiChatRepository,
    private readonly resourceValidatorService: ResourceValidatorService
  ) {}

  async execute(command: UpsertChatCommand): Promise<AiChatEntity> {
    const { user, id, messages, activeStreamId, resourceType, resourceId } = command;
    const { environmentId, organizationId, _id: userId } = user;

    if (!id) {
      if (!resourceType) {
        throw new BadRequestException('Resource type is required to create a chat');
      }
      if (resourceType === AiResourceTypeEnum.WORKFLOW) {
        await this.resourceValidatorService.validateWorkflowLimit(command.user.environmentId);
      }

      return this.aiChatRepository.create({
        _environmentId: environmentId,
        _organizationId: organizationId,
        _userId: userId,
        resourceType,
        resourceId,
        messages: messages ?? [],
        activeStreamId: activeStreamId ?? null,
      });
    }

    const existingChat = await this.aiChatRepository.findOne({
      _id: id,
      _environmentId: environmentId,
      _organizationId: organizationId,
      _userId: userId,
    });

    if (!existingChat) {
      throw new NotFoundException(`Chat with id ${id} not found`);
    }

    const updateData: Record<string, unknown> = {
      messages,
      activeStreamId: activeStreamId,
      resourceId,
    };

    await this.aiChatRepository.update(
      {
        _id: id,
        _environmentId: environmentId,
        _organizationId: organizationId,
      },
      { $set: updateData }
    );

    const updated = await this.aiChatRepository.findOne({
      _id: id,
      _environmentId: environmentId,
      _organizationId: organizationId,
      _userId: userId,
    });

    if (!updated) {
      throw new Error(`Failed to update chat with id ${id}`);
    }

    return updated;
  }
}
