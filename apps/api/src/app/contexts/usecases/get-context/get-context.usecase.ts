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
      identifier: command.identifier,
      ...(command.type && { type: command.type }),
    });

    if (!context) {
      const typeMessage = command.type ? `and type '${command.type}'` : '';

      throw new NotFoundException(
        `Context with identifier '${command.identifier}'${typeMessage} not found in environment ${command.environmentId}`
      );
    }

    return context;
  }
}
