import { Injectable, NotFoundException } from '@nestjs/common';
import { IExternalSubscribersEntity, SubscriberEntity, SubscriberRepository } from '@novu/dal';
import { SubscriberDto } from '@novu/shared';

import { SearchByExternalSubscriberIdsCommand } from './search-by-external-subscriber-ids.command';

@Injectable()
export class SearchByExternalSubscriberIds {
  constructor(private subscriberRepository: SubscriberRepository) {}

  async execute(command: SearchByExternalSubscriberIdsCommand): Promise<SubscriberDto[]> {
    const entity = this.mapToEntity(command);

    const entities = await this.subscriberRepository.searchByExternalSubscriberIds(entity);

    return entities.map(this.mapFromEntity);
  }

  private mapToEntity(command: SearchByExternalSubscriberIdsCommand): IExternalSubscribersEntity {
    return {
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      externalSubscriberIds: command.externalSubscriberIds,
    };
  }

  private mapFromEntity(entity: SubscriberEntity): SubscriberDto {
    const { _id, createdAt, updatedAt, ...rest } = entity;

    return {
      ...rest,
      _id,
    };
  }
}
