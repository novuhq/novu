import { Injectable } from '@nestjs/common';
import { ContextEntity, ContextRepository } from '@novu/dal';
import { InstrumentUsecase } from '../../instrumentation';
import { PinoLogger } from '../../logging';
import { ResolveContextFromKeysCommand } from './resolve-context-from-keys.command';

@Injectable()
export class ResolveContextFromKeys {
  constructor(
    private logger: PinoLogger,
    private contextRepository: ContextRepository
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  public async execute(command: ResolveContextFromKeysCommand): Promise<ContextEntity[]> {
    if (command.contextKeys.length === 0) {
      return [];
    }

    return this.contextRepository.findByKeys(command.environmentId, command.organizationId, command.contextKeys);
  }
}
