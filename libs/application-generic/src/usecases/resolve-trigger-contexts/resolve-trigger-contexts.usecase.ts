import { Injectable } from '@nestjs/common';
import { ContextEntity, ContextRepository } from '@novu/dal';
import { ContextData, ContextId, ContextPayload, ContextType } from '@novu/shared';
import { isEqual } from 'lodash';

import { InstrumentUsecase } from '../../instrumentation';
import { ResolveTriggerContextsCommand } from './resolve-trigger-contexts.command';

@Injectable()
export class ResolveTriggerContexts {
  constructor(private contextRepository: ContextRepository) {}

  @InstrumentUsecase()
  async execute(command: ResolveTriggerContextsCommand): Promise<ContextEntity[]> {
    const resolvePromises = Object.entries(command.context).map(([type, value]) => {
      if (!value) {
        return null;
      }

      const { id, data } =
        typeof value === 'string' ? { id: value, data: undefined } : { id: value.id, data: value.data };

      return this.resolveContext(command.environmentId, command.organizationId, type, id, data);
    });

    const validPromises = resolvePromises.filter((promise): promise is Promise<ContextEntity> => promise !== null);
    const contexts = await Promise.all(validPromises);

    return contexts.sort((a, b) => a.key.localeCompare(b.key));
  }

  private async resolveContext(
    environmentId: string,
    organizationId: string,
    type: ContextType,
    id: ContextId,
    data?: ContextData
  ): Promise<ContextEntity> {
    const context = await this.contextRepository.findOrCreateContext(environmentId, organizationId, type, id, data);

    if (data === undefined) {
      return context;
    }

    const normalizedData = data || {};

    if (isEqual(context.data, normalizedData)) {
      return context;
    }

    const query = {
      _environmentId: environmentId,
      _organizationId: organizationId,
      id,
      type,
    };

    const updatedContext = await this.contextRepository.findOneAndUpdate(
      query,
      { $set: { data: normalizedData } },
      { new: true }
    );

    if (!updatedContext) {
      return context;
    }

    return updatedContext;
  }
}
