import { Injectable } from '@nestjs/common';
import { ContextEntity, ContextRepository } from '@novu/dal';
import { ContextData, ContextType, ContextValue } from '@novu/shared';
import { InstrumentUsecase } from '../../instrumentation';
import { PinoLogger } from '../../logging';
import { ResolveContextCommand } from './resolve-context.command';

@Injectable()
export class ResolveContext {
  constructor(
    private logger: PinoLogger,
    private contextRepository: ContextRepository
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  public async execute(command: ResolveContextCommand): Promise<ContextEntity[]> {
    const contexts: ContextEntity[] = [];

    // Process each context type-value pair
    for (const [contextType, contextValue] of Object.entries(command.context)) {
      const context = await this.resolveContextTypeAndValue(command, contextType as ContextType, contextValue);
      contexts.push(context);
    }

    return contexts;
  }

  private async resolveContextTypeAndValue(
    command: ResolveContextCommand,
    contextType: ContextType,
    contextValue: ContextValue
  ): Promise<ContextEntity> {
    if (typeof contextValue === 'string') {
      return this.handleStringValue(command, contextType, contextValue);
    }

    return this.handleObjectValue(command, contextType, contextValue);
  }

  private async handleStringValue(
    command: ResolveContextCommand,
    contextType: ContextType,
    id: string
  ): Promise<ContextEntity> {
    return this.contextRepository.upsertContext(command.environmentId, command.organizationId, contextType, id);
  }

  private async handleObjectValue(
    command: ResolveContextCommand,
    contextType: ContextType,
    contextValue: { id: string; data?: ContextData }
  ): Promise<ContextEntity> {
    const { id, data } = contextValue;

    return this.contextRepository.upsertContext(command.environmentId, command.organizationId, contextType, id, data);
  }
}
