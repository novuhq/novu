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

  /**
   * For a payload signed by a token issued at `issuedAtSeconds` (its JWT `iat`), the signer is the source of
   * truth. An entry with `data` replaces the stored record's whole `data`, like `PATCH /v2/contexts` does: fields
   * the signer left out are dropped, so no field an unsigned session saved can survive next to signed ones. The
   * data is written when the record is missing, unchanged since it was created (an unsigned session can only
   * create records), or last changed before the token's issue second ended. A record changed later keeps its
   * data, so an older token cannot undo a newer update such as a plan downgrade. `iat` has whole-second
   * precision, so an update and a token issued in the same second resolve to the token. An entry with only an
   * id signs no data, so the stored record is found or created as in `findOrCreateContextsFromPayload`.
   */
  async upsertContextsFromPayload(
    environmentId: string,
    organizationId: string,
    contextPayload: ContextPayload,
    issuedAtSeconds: number
  ): Promise<ContextEntity[]> {
    const contexts = await Promise.all(
      Object.entries(contextPayload).flatMap(([type, value]) => {
        if (!value) return [];
        if (typeof value === 'string' || value.data === undefined) {
          const id = typeof value === 'string' ? value : value.id;

          return [this.findOrCreateContext(environmentId, organizationId, type, id)];
        }

        return [
          this.writeSignedContextData(environmentId, organizationId, type, value.id, value.data, issuedAtSeconds),
        ];
      })
    );

    return contexts.sort((a, b) => a.key.localeCompare(b.key));
  }

  private async writeSignedContextData(
    environmentId: string,
    organizationId: string,
    type: ContextType,
    id: ContextId,
    data: ContextData,
    issuedAtSeconds: number
  ): Promise<ContextEntity> {
    const issueSecondEnd = new Date((issuedAtSeconds + 1) * 1000);
    const updated = await this.findOneAndUpdate(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        type,
        id,
        $or: [{ updatedAt: { $lt: issueSecondEnd } }, { $expr: { $eq: ['$updatedAt', '$createdAt'] } }],
      },
      { $set: { data } },
      { new: true }
    );

    return updated ?? this.findOrCreateContext(environmentId, organizationId, type, id, data);
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
      return existingContext;
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
          return context;
        }
      }

      throw error;
    }
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
