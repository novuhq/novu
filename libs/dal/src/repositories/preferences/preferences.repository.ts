import { FilterQuery } from 'mongoose';
import { SoftDeleteModel } from 'mongoose-delete';

import { BaseRepository } from '../base-repository';
import { DalException } from '../../shared';
import type { EnforceEnvOrOrgIds } from '../../types/enforce';
import { PreferencesDBModel, PreferencesEntity } from './preferences.entity';
import { Preferences } from './preferences.schema';

type PreferencesQuery = FilterQuery<PreferencesDBModel> & EnforceEnvOrOrgIds;

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

  async delete(query: PreferencesQuery) {
    const item = await this.findOne({ _id: query._id, _environmentId: query._environmentId });
    if (!item) throw new DalException(`Could not find preferences with id ${query._id}`);

    return await this.preferences.delete({ _id: item._id, _environmentId: item._environmentId });
  }

  async findDeleted(query: PreferencesQuery): Promise<PreferencesEntity> {
    const res: PreferencesEntity = await this.preferences.findDeleted(query);

    return this.mapEntity(res);
  }
}
