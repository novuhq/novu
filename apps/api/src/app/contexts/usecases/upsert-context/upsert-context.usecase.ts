import { Injectable } from '@nestjs/common';
import { ContextEntity, ContextRepository } from '@novu/dal';
import { UpsertContextCommand } from './upsert-context.command';

@Injectable()
export class UpsertContext {
  constructor(private contextRepository: ContextRepository) {}

  async execute(command: UpsertContextCommand): Promise<ContextEntity> {
    return this.contextRepository.upsertContext(
      command.environmentId,
      command.organizationId,
      command.type,
      command.id,
      command.data
    );
  }
}
