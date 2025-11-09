import { Injectable, NotFoundException } from '@nestjs/common';
import { ContextEntity, ContextRepository } from '@novu/dal';
import { UpdateContextCommand } from './update-context.command';

@Injectable()
export class UpdateContext {
  constructor(private contextRepository: ContextRepository) {}

  async execute(command: UpdateContextCommand): Promise<ContextEntity> {
    const query = {
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      type: command.type,
      id: command.id,
    };

    // Check if context exists
    const existingContext = await this.contextRepository.findOne(query);

    if (!existingContext) {
      throw new NotFoundException(`Context with type '${command.type}' and id '${command.id}' not found`);
    }

    // Update only the data field
    const updatedContext = await this.contextRepository.findOneAndUpdate(
      query,
      { $set: { data: command.data } },
      { new: true }
    );

    // biome-ignore lint/style/noNonNullAssertion: we know it exists since we found it
    return updatedContext!;
  }
}
