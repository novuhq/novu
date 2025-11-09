import { Injectable, NotFoundException } from '@nestjs/common';
import { ContextEntity, ContextRepository } from '@novu/dal';
import { GetContextCommand } from './get-context.command';

@Injectable()
export class GetContext {
  constructor(private contextRepository: ContextRepository) {}

  async execute(command: GetContextCommand): Promise<ContextEntity> {
    const context = await this.contextRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      id: command.id,
      type: command.type,
    });

    if (!context) {
      throw new NotFoundException(
        `Context with id '${command.id}' and type '${command.type}' not found in environment ${command.environmentId}`
      );
    }

    return context;
  }
}
