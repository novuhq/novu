import { BadRequestException, Injectable } from '@nestjs/common';
import { EnvironmentId, OrganizationId, LayoutEntity, LayoutRepository } from '@novu/dal';

import { FilterLayoutsCommand } from './filter-layouts.command';

import { LayoutDto } from '../../dtos/layout.dto';

const DEFAULT_LAYOUT_LIMIT = 10;

@Injectable()
export class FilterLayoutsUseCase {
  constructor(private layoutRepository: LayoutRepository) {}

  async execute(command: FilterLayoutsCommand) {
    const { pageSize = DEFAULT_LAYOUT_LIMIT, page = 0 } = command;

    if (pageSize > DEFAULT_LAYOUT_LIMIT) {
      throw new BadRequestException(`Page size can not be larger then ${DEFAULT_LAYOUT_LIMIT}`);
    }

    const query = this.mapFromCommandToEntity(command);

    const totalCount = await this.layoutRepository.count(query);

    const skipTimes = page <= 0 ? 0 : page;
    const pagination = {
      limit: pageSize,
      skip: skipTimes * pageSize,
    };

    const filteredLayouts = await this.layoutRepository.filterLayouts(query, pagination);

    return {
      page,
      totalCount,
      pageSize,
      data: filteredLayouts.map(this.mapFromEntityToDto),
    };
  }

  private mapFromCommandToEntity(
    command: FilterLayoutsCommand
  ): Pick<LayoutEntity, '_environmentId' | '_organizationId'> {
    return {
      _environmentId: LayoutRepository.convertStringToObjectId(command.environmentId),
      _organizationId: LayoutRepository.convertStringToObjectId(command.organizationId),
    } as Pick<LayoutEntity, '_environmentId' | '_organizationId'>;
  }

  private mapFromEntityToDto(layout: LayoutEntity): LayoutDto {
    return {
      ...layout,
      _id: LayoutRepository.convertObjectIdToString(layout._id),
      _organizationId: LayoutRepository.convertObjectIdToString(layout._organizationId),
      _environmentId: LayoutRepository.convertObjectIdToString(layout._environmentId),
      isDeleted: layout.deleted,
    };
  }
}
