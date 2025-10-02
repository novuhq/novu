import { ConflictException, Injectable } from '@nestjs/common';
import { ContextEntity, ContextRepository } from '@novu/dal';
import { createContextKey } from '@novu/shared';
import { CreateContextCommand } from './create-context.command';

@Injectable()
export class CreateContext {
  constructor(private contextRepository: ContextRepository) {}

  async execute(command: CreateContextCommand): Promise<ContextEntity> {
    // Check if context already exists
    const existingContext = await this.contextRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      type: command.type,
      id: command.id,
    });

    if (existingContext) {
      throw new ConflictException(`Context with type '${command.type}' and id '${command.id}' already exists`);
    }

    // Create new context
    return this.contextRepository.create({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      type: command.type,
      id: command.id,
      key: createContextKey(command.type, command.id),
      data: command.data || {},
    });
  }
}
