import { ContextData, ContextId, ContextType, createContextKey } from '@novu/shared';
import { FilterQuery } from 'mongoose';
import type { EnforceEnvOrOrgIds } from '../../types';
import { BaseRepository } from '../base-repository';
import { ContextDBModel, ContextEntity } from './context.entity';
import { Context } from './context.schema';

export class ContextRepository extends BaseRepository<ContextDBModel, ContextEntity, EnforceEnvOrOrgIds> {
  constructor() {
    super(Context, ContextEntity);
  }

  async upsertContext(
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

    // Try to find existing context first
    const existingContext = await this.findOne(query);

    if (existingContext) {
      // Update path: context already exists
      const updateFields: Partial<ContextEntity> = {};

      // Only update data if explicitly provided (even if empty object or null)
      if (data !== undefined) {
        updateFields.data = data;
      }

      const updatedContext = await this.findOneAndUpdate(query, { $set: updateFields }, { new: true });

      // biome-ignore lint/style/noNonNullAssertion: we know it exists since we found it
      return updatedContext!;
    } else {
      // Create path: context doesn't exist, create new one
      const newContext: FilterQuery<ContextDBModel> & EnforceEnvOrOrgIds = {
        _environmentId: environmentId,
        _organizationId: organizationId,
        id,
        type,
        key: createContextKey(type, id),
        data: data || {},
      };

      return this.create(newContext);
    }
  }
}
