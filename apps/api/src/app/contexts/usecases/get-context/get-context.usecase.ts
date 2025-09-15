import { Injectable, NotFoundException } from '@nestjs/common';
import { ContextRepository } from '@novu/dal';
import { mapContextEntityToDto } from '../../dtos';
import { GetContextCommand } from './get-context.command';

@Injectable()
export class GetContext {
  constructor(private contextRepository: ContextRepository) {}

  async execute(command: GetContextCommand) {
    const context = await this.contextRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      identifier: command.identifier,
    });

    if (!context) {
      throw new NotFoundException(`Context with identifier '${command.identifier}' not found`);
    }

    return mapContextEntityToDto(context);
  }
}
