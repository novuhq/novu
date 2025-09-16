import { Injectable, NotFoundException } from '@nestjs/common';
import { ContextEntity, ContextRepository } from '@novu/dal';
import { UpdateContextCommand } from './update-context.command';

@Injectable()
export class UpdateContext {
  constructor(private contextRepository: ContextRepository) {}

  async execute(command: UpdateContextCommand): Promise<ContextEntity> {
    const existingContext = await this.contextRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      identifier: command.identifier,
    });

    if (!existingContext) {
      throw new NotFoundException(
        `Context with identifier '${command.identifier}' not found in environment ${command.environmentId}`
      );
    }

    const updateData: Partial<Pick<ContextEntity, 'data'>> = {};

    if (command.data !== undefined) {
      updateData.data = command.data;
    }

    const updatedContext = await this.contextRepository.findOneAndUpdate(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        identifier: command.identifier,
      },
      {
        $set: {
          data: command.data,
        },
      },
      { new: true }
    );

    // biome-ignore lint/style/noNonNullAssertion: updatedContext is always found
    return updatedContext!;
  }
}
