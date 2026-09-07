import { Injectable } from '@nestjs/common';
import { InstrumentUsecase, LayoutDtoV0, LayoutResponseDto, mapLayoutToResponseDto } from '@novu/application-generic';
import { LayoutEntity, LayoutRepository } from '@novu/dal';
import { ListLayoutResponseDto } from '../../dtos';
import { ListLayoutsCommand } from './list-layouts.command';

@Injectable()
export class ListLayoutsUseCase {
  constructor(private layoutRepository: LayoutRepository) {}

  @InstrumentUsecase()
  async execute(command: ListLayoutsCommand): Promise<ListLayoutResponseDto> {
    const res = await this.layoutRepository.getV2List({
      organizationId: command.user.organizationId,
      environmentId: command.user.environmentId,
      skip: command.offset,
      limit: command.limit,
      searchQuery: command.searchQuery,
      orderBy: command.orderBy ? command.orderBy : 'createdAt',
      orderDirection: command.orderDirection,
    });

    if (res.data === null || res.data === undefined) {
      return { layouts: [], totalCount: 0 };
    }

    const layoutDtos = res.data.map((layout) => this.mapLayoutToResponseDto(layout));

    return {
      layouts: layoutDtos,
      totalCount: res.totalCount,
    };
  }

  private mapLayoutToResponseDto(layout: LayoutEntity): LayoutResponseDto {
    const layoutDto = this.mapFromEntity(layout);

    return mapLayoutToResponseDto({
      layout: layoutDto,
      controlValues: null,
      variables: {},
    });
  }

  private mapFromEntity(layout: LayoutEntity): LayoutDtoV0 {
    return {
      ...layout,
      _id: layout._id,
      _organizationId: layout._organizationId,
      _environmentId: layout._environmentId,
      isDeleted: layout.deleted,
      controls: {},
    };
  }
}
