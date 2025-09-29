import { Injectable } from '@nestjs/common';
import { ContextEntity, ContextRepository, EnforceEnvOrOrgIds } from '@novu/dal';
import { DirectionEnum } from '@novu/shared';
import { FilterQuery } from 'mongoose';
import { ListContextsCommand } from './list-contexts.command';

@Injectable()
export class ListContexts {
  constructor(private contextRepository: ContextRepository) {}

  async execute(command: ListContextsCommand) {
    const filter: FilterQuery<ContextEntity> & EnforceEnvOrOrgIds = {
      _environmentId: command.user.environmentId,
      _organizationId: command.user.organizationId,
    };

    if (command.type) {
      filter.type = command.type;
    }

    if (command.id) {
      filter.id = command.id;
    }

    // Search across the composite key field (format: "type:id")
    if (command.search) {
      filter.key = { $regex: command.search, $options: 'i' };
    }

    // Handle cursor-based pagination
    let context: ContextEntity | null = null;
    const id = command.before || command.after;

    if (id) {
      context = await this.contextRepository.findOne({
        _environmentId: command.user.environmentId,
        _organizationId: command.user.organizationId,
        _id: id,
      });

      if (!context) {
        return {
          data: [],
          next: null,
          previous: null,
          totalCount: 0,
          totalCountCapped: false,
        };
      }
    }

    const afterCursor =
      command.after && context
        ? {
            sortBy: context[command.orderBy || 'createdAt'],
            paginateField: context._id,
          }
        : undefined;

    const beforeCursor =
      command.before && context
        ? {
            sortBy: context[command.orderBy || 'createdAt'],
            paginateField: context._id,
          }
        : undefined;

    const pagination = await this.contextRepository.findWithCursorBasedPagination({
      query: filter,
      paginateField: '_id',
      sortBy: command.orderBy || 'createdAt',
      sortDirection: command.orderDirection || DirectionEnum.DESC,
      limit: command.limit,
      after: afterCursor,
      before: beforeCursor,
      includeCursor: command.includeCursor,
    });

    return {
      data: pagination.data,
      next: pagination.next,
      previous: pagination.previous,
      totalCount: pagination.totalCount,
      totalCountCapped: pagination.totalCountCapped,
    };
  }
}
