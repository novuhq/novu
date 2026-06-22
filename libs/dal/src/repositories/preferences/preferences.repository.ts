import { FilterQuery } from 'mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import { DalException } from '../../shared';
import type { EnforceEnvOrOrgIds } from '../../types/enforce';
import { BaseRepository } from '../base-repository';
import { PreferencesDBModel, PreferencesEntity } from './preferences.entity';
import { Preferences } from './preferences.schema';

type PreferencesQuery = FilterQuery<PreferencesDBModel> & EnforceEnvOrOrgIds;

function toPlainPreference(data: unknown): unknown {
  return JSON.parse(JSON.stringify(data));
}

export class PreferencesRepository extends BaseRepository<PreferencesDBModel, PreferencesEntity, EnforceEnvOrOrgIds> {
  private preferences: SoftDeleteModel;

  constructor() {
    super(Preferences, PreferencesEntity);
    this.preferences = Preferences;
  }

  async findById(id: string, environmentId: string) {
    const requestQuery: PreferencesQuery = {
      _id: id,
      _environmentId: environmentId,
    };

    const item = await this.MongooseModel.findOne(requestQuery);

    return this.mapEntity(item);
  }

  async findDeleted(query: PreferencesQuery): Promise<PreferencesEntity> {
    const res: PreferencesEntity = await this.preferences.findDeleted(query);

    return this.mapEntity(res);
  }

  /**
   * Hot-path reads for preference computation (e.g. the v2 /preferences endpoint).
   *
   * Skips the `class-transformer` `plainToInstance` pass. `PreferencesEntity` declares no
   * class-transformer decorators, so the JSON round-trip alone is behavior-identical for all
   * downstream consumers while removing the dominant synchronous CPU cost under high concurrency.
   *
   * Both methods use `.lean()` (matching the base `find` path). The base `findOne` hydrates
   * via `.toObject()` and exposes the `id` virtual, but preference computation only reads
   * document fields — never `id` — so lean is sufficient and cheaper.
   */
  async findForComputation(
    query: PreferencesQuery,
    options: { readPreference?: 'secondaryPreferred' | 'primary' } = {}
  ): Promise<PreferencesEntity[]> {
    const data = await this.MongooseModel.find(query)
      .read(options.readPreference || 'primary')
      .lean()
      .exec();

    return toPlainPreference(data) as PreferencesEntity[];
  }

  async findOneForComputation(
    query: PreferencesQuery,
    options: { readPreference?: 'secondaryPreferred' | 'primary' } = {}
  ): Promise<PreferencesEntity | null> {
    const data = await this.MongooseModel.findOne(query)
      .read(options.readPreference || 'primary')
      .lean()
      .exec();

    if (!data) {
      return null;
    }

    return toPlainPreference(data) as PreferencesEntity;
  }
}
