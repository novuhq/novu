import { BaseRepository } from '../base-repository';
import { IntegrationEntity } from './integration.entity';
import { Integration } from './integration.schema';
import { DalException } from '../../shared/exceptions/dal.exeption';

export class IntegrationRepository extends BaseRepository<IntegrationEntity> {
  constructor() {
    super(Integration, IntegrationEntity);
  }

  async findByApplicationId(applicationId: string): Promise<IntegrationEntity[]> {
    return await this.find({
      _applicationId: applicationId,
    });
  }

  async create(data: Partial<IntegrationEntity>): Promise<IntegrationEntity> {
    const existingIntegration = await this.findOne({
      _applicationId: data._applicationId,
      providerId: data.providerId,
      channel: data.channel,
    });
    if (!existingIntegration) {
      return await super.create(data);
    }

    const test = new DalException(
      '3333 Duplicate key - One application may not have two providers of the same channel type'
    );

    console.log(test instanceof DalException);

    throw test;
  }
}
