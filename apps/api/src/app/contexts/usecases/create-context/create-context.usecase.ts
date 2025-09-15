import { ConflictException, Injectable } from '@nestjs/common';
import { ContextRepository } from '@novu/dal';
import { mapContextEntityToDto } from '../../dtos';
import { CreateContextCommand } from './create-context.command';

@Injectable()
export class CreateContext {
  constructor(private contextRepository: ContextRepository) {}

  async execute(command: CreateContextCommand) {
    // Check if context with this identifier already exists
    const existingContext = await this.contextRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      identifier: command.identifier,
    });

    if (existingContext) {
      throw new ConflictException(`Context with identifier ${command.identifier} already exists`);
    }

    const context = await this.contextRepository.create({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      identifier: command.identifier,
      type: command.type,
      data: command.data,
    });

    return mapContextEntityToDto(context);
  }
}
