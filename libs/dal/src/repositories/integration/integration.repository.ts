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
}
