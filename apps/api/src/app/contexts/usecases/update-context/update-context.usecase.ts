import { Injectable, NotFoundException } from '@nestjs/common';
import { ContextEntity, ContextRepository } from '@novu/dal';
import { assertSafeContextBridgeUrl } from '../assert-safe-context-bridge-url';
import { UpdateContextCommand } from './update-context.command';

@Injectable()
export class UpdateContext {
  constructor(private contextRepository: ContextRepository) {}

  async execute(command: UpdateContextCommand): Promise<ContextEntity> {
    await assertSafeContextBridgeUrl(command.bridgeUrl);

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

    // `data` is always replaced; `bridgeUrl` is managed independently — set when a URL is provided,
    // unset when explicitly `null`, and left untouched when omitted.
    const update: {
      $set: { data: typeof command.data; bridgeUrl?: string };
      $unset?: { bridgeUrl: '' };
    } = { $set: { data: command.data } };

    if (command.bridgeUrl === null) {
      update.$unset = { bridgeUrl: '' };
    } else if (command.bridgeUrl !== undefined) {
      update.$set.bridgeUrl = command.bridgeUrl;
    }

    const updatedContext = await this.contextRepository.findOneAndUpdate(query, update, { new: true });

    // biome-ignore lint/style/noNonNullAssertion: we know it exists since we found it
    return updatedContext!;
  }
}
