import { FilterQuery } from 'mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import { DalException } from '../../shared';
import type { EnforceEnvOrOrgIds } from '../../types/enforce';
import { BaseRepository } from '../base-repository';
import { TranslationEntity } from './translation.entity';
import { Translation, TranslationModel } from './translation.schema';

type TranslationQuery = FilterQuery<TranslationModel> & EnforceEnvOrOrgIds;

export class TranslationRepository extends BaseRepository<TranslationModel, TranslationEntity, EnforceEnvOrOrgIds> {
  private translation: SoftDeleteModel;

  constructor() {
    super(Translation, TranslationEntity);
    this.translation = Translation;
  }

  async delete(query: TranslationQuery) {
    return await this.translation.delete({ _id: query._id, _environmentId: query._environmentId });
  }

  async deleteMany(query: TranslationQuery) {
    return await this.translation.delete(query);
  }

  async findDeleted(query: TranslationQuery): Promise<TranslationEntity[]> {
    const res: TranslationEntity[] = await this.translation.findDeleted(query);

    return res.map((item) => this.mapEntity(item));
  }
}
