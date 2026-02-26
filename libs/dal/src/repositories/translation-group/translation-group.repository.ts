import { FilterQuery } from 'mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import type { EnforceEnvOrOrgIds } from '../../types/enforce';
import { BaseRepository } from '../base-repository';
import { TranslationGroupEntity, TranslationGroupWithTranslations } from './translation-group.entity';
import { TranslationGroup, TranslationGroupModel } from './translation-group.schema';

type TranslationGroupQuery = FilterQuery<TranslationGroupModel> & EnforceEnvOrOrgIds;

export class TranslationGroupRepository extends BaseRepository<
  TranslationGroupModel,
  TranslationGroupEntity,
  EnforceEnvOrOrgIds
> {
  private translationGroup: SoftDeleteModel;
  constructor() {
    super(TranslationGroup, TranslationGroupEntity);
    this.translationGroup = TranslationGroup;
  }

  public async getTranslations(
    organizationId: string,
    environmentId: string,
    identifier: string,
    withTranslations = false
  ): Promise<TranslationGroupWithTranslations | TranslationGroupEntity> {
    if (!withTranslations) {
      const item = await this.MongooseModel.findOne({
        _environmentId: environmentId,
        _organizationId: organizationId,
        identifier,
      });

      return this.mapEntity(item) as TranslationGroupEntity;
    }

    const item = await this.MongooseModel.findOne({
      _environmentId: environmentId,
      _organizationId: organizationId,
      identifier,
    }).populate('translations');

    return this.mapEntity(item) as TranslationGroupWithTranslations;
  }

  public async getList(
    organizationId: string,
    environmentId: string,
    skip = 0,
    limit = 10
  ): Promise<{
    data: TranslationGroupWithTranslations[];
    totalCount: number;
  }> {
    const totalItemsCount = await this.count({
      _environmentId: environmentId,
      _organizationId: organizationId,
    });

    const items = await this.MongooseModel.find({
      _environmentId: environmentId,
      _organizationId: organizationId,
    })
      .skip(skip)
      .limit(limit)
      .populate('translations');

    return { totalCount: totalItemsCount, data: this.mapEntities(items) as TranslationGroupWithTranslations[] };
  }

  public async delete(query: TranslationGroupQuery) {
    return await this.translationGroup.delete({
      _id: query._id,
      _environmentId: query._environmentId,
    });
  }

  public async findDeleted(query: TranslationGroupQuery): Promise<TranslationGroupEntity[]> {
    const res: TranslationGroupEntity[] = await this.translationGroup.findDeleted(query);

    return res.map((item) => this.mapEntity(item));
  }

  public async getVariables(
    organizationId: string,
    environmentId: string,
    defaultLocale: string
  ): Promise<TranslationGroupWithTranslations[]> {
    const items = await this.MongooseModel.find({
      _environmentId: environmentId,
      _organizationId: organizationId,
    }).populate({ path: 'translations', match: { isoLanguage: defaultLocale }, select: 'translations' });

    return this.mapEntities(items) as TranslationGroupWithTranslations[];
  }
}
