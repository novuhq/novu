import { Injectable, NotFoundException } from '@nestjs/common';
import { ContextRepository } from '@novu/dal';
import { DeleteContextCommand } from './delete-context.command';

@Injectable()
export class DeleteContext {
  constructor(private contextRepository: ContextRepository) {}

  async execute(command: DeleteContextCommand) {
    const existingContext = await this.contextRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      id: command.id,
      type: command.type,
    });

    if (!existingContext) {
      throw new NotFoundException(
        `Context with id '${command.id}' and type '${command.type}' not found in environment ${command.environmentId}`
      );
    }

    await this.contextRepository.delete({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      id: command.id,
      type: command.type,
    });
  }
}
