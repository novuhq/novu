import { BadRequestException, Injectable } from '@nestjs/common';
import { LayoutEntity, LayoutRepository } from '@novu/dal';

import { FilterLayoutsCommand } from './filter-layouts.command';

import { LayoutDto } from '../../dtos/layout.dto';

const DEFAULT_LAYOUT_LIMIT = 10;
const MAX_LAYOUT_LIMIT = 1000;

@Injectable()
export class FilterLayoutsUseCase {
  constructor(private layoutRepository: LayoutRepository) {}

  async execute(command: FilterLayoutsCommand) {
    const { pageSize = DEFAULT_LAYOUT_LIMIT, page = 0 } = command;

    if (pageSize > MAX_LAYOUT_LIMIT) {
      throw new BadRequestException(`Page size can not be larger then ${MAX_LAYOUT_LIMIT}`);
    }

    const query = this.mapFromCommandToEntity(command);

    const totalCount = await this.layoutRepository.count(query);

    const skipTimes = page <= 0 ? 0 : page;
    const pagination = {
      limit: pageSize,
      skip: skipTimes * pageSize,
      ...(command.sortBy && { sortBy: command.sortBy }),
      ...(command.orderBy && { orderBy: command.orderBy }),
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
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    } as Pick<LayoutEntity, '_environmentId' | '_organizationId'>;
  }

  private mapFromEntityToDto(layout: LayoutEntity): LayoutDto {
    return {
      ...layout,
      _id: layout._id,
      _organizationId: layout._organizationId,
      _environmentId: layout._environmentId,
      isDeleted: layout.deleted,
    };
  }
}
