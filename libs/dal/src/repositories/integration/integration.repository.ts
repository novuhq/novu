import { UnprocessableEntityException } from '@nestjs/common';
import { Document, FilterQuery } from 'mongoose';
import { BaseRepository } from '../base-repository';
import { IntegrationEntity } from './integration.entity';
import { Integration } from './integration.schema';
import { DalException } from '../../shared';

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
    if (existingIntegration) {
      throw new DalException('Duplicate key - One application may not have two providers of the same channel type');
    }

    return await super.create(data);
  }

  async update(
    query: FilterQuery<IntegrationEntity & Document>,
    updateBody: any
  ): Promise<{
    matched: number;
    modified: number;
  }> {
    if (query.active === true) {
      await this.deactivatedOtherActiveChannels(query);
    }

    return await super.update({ _id: query._id }, updateBody);
  }

  async deactivatedOtherActiveChannels(query: FilterQuery<IntegrationEntity & Document>): Promise<void> {
    const otherExistedIntegration = (
      await this.find({
        _applicationId: query._applicationId,
        channel: query.channel,
        active: true,
      })
    ).filter((x) => x.providerId !== query.providerId);

    for (const x of otherExistedIntegration) {
      const deactivatedIntegration = x;

      deactivatedIntegration.active = false;
      await super.update({ _id: deactivatedIntegration._id }, deactivatedIntegration);
    }
  }
}
