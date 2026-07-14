import { ContextData, ContextId, ContextPayload, ContextType, createContextKey } from '@novu/shared';
import { FilterQuery } from 'mongoose';
import { type EnforceEnvOrOrgIds, ErrorCodesEnum } from '../../types';
import { BaseRepository } from '../base-repository';
import { ContextDBModel, ContextEntity } from './context.entity';
import { Context } from './context.schema';

export class ContextRepository extends BaseRepository<ContextDBModel, ContextEntity, EnforceEnvOrOrgIds> {
  constructor() {
    super(Context, ContextEntity);
  }

  async findOrCreateContextsFromPayload(
    environmentId: string,
    organizationId: string,
    contextPayload: ContextPayload
  ): Promise<ContextEntity[]> {
    const findOrCreatePromises = Object.entries(contextPayload).map(([type, value]) => {
      if (!value) return null;

      const { id, data } =
        typeof value === 'string' ? { id: value, data: undefined } : { id: value.id, data: value.data };

      return this.findOrCreateContext(environmentId, organizationId, type, id, data);
    });

    const validPromises = findOrCreatePromises.filter((promise): promise is Promise<ContextEntity> => promise !== null);

    const contexts = await Promise.all(validPromises);

    return contexts.sort((a, b) => a.key.localeCompare(b.key));
  }

  async findOrCreateContext(
    environmentId: string,
    organizationId: string,
    type: ContextType,
    id: ContextId,
    data?: ContextData
  ): Promise<ContextEntity> {
    const query = {
      _environmentId: environmentId,
      _organizationId: organizationId,
      id,
      type,
    };

    const existingContext = await this.findOne(query);

    if (existingContext) {
      return this.upsertContextData(query, existingContext, data);
    }

    const newContext: FilterQuery<ContextDBModel> & EnforceEnvOrOrgIds = {
      _environmentId: environmentId,
      _organizationId: organizationId,
      id,
      type,
      key: createContextKey(type, id),
      data: data || {},
    };

    try {
      return await this.create(newContext);
    } catch (error) {
      const isDuplicateKeyError =
        error && typeof error === 'object' && 'code' in error && error.code === ErrorCodesEnum.DUPLICATE_KEY;

      if (isDuplicateKeyError) {
        const context = await this.findOne(query);
        if (context) {
          return this.upsertContextData(query, context, data);
        }
      }

      throw error;
    }
  }

  private async upsertContextData(
    query: FilterQuery<ContextDBModel> & EnforceEnvOrOrgIds,
    existingContext: ContextEntity,
    data?: ContextData
  ): Promise<ContextEntity> {
    if (data === undefined) {
      return existingContext;
    }

    const normalizedData = data || {};
    const updatedContext = await this.findOneAndUpdate(query, { $set: { data: normalizedData } }, { new: true });

    if (!updatedContext) {
      return existingContext;
    }

    return updatedContext;
  }

  async findByKeys(environmentId: string, organizationId: string, contextKeys: string[]): Promise<ContextEntity[]> {
    if (contextKeys.length === 0) {
      return [];
    }

    const query = {
      _environmentId: environmentId,
      _organizationId: organizationId,
      key: { $in: contextKeys },
    };

    return this.find(query);
  }
}
