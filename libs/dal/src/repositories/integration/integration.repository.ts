import { HttpException, HttpStatusCode } from '@notifire/shared';
import { BaseRepository } from '../base-repository';
import { IntegrationEntity } from './integration.entity';
import { Integration } from './integration.schema';

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

    throw new HttpException(
      HttpStatusCode.UNPROCESSABLE_ENTITY,
      'Duplicate key - One application may not have two providers of the same channel type'
    );
  }
}
