import { Injectable } from '@nestjs/common';
import { DomainRepository } from '@novu/dal';
import { DirectionEnum } from '@novu/shared';

import { ListDomainsResponseDto } from '../../dtos/list-domains-response.dto';
import { toDomainResponse } from '../../mappers/domain-response.mapper';
import { GetDomainsCommand } from './get-domains.command';

@Injectable()
export class GetDomains {
  constructor(private readonly domainRepository: DomainRepository) {}

  async execute(command: GetDomainsCommand): Promise<ListDomainsResponseDto> {
    const pagination = await this.domainRepository.listDomains({
      environmentId: command.user.environmentId,
      organizationId: command.user.organizationId,
      limit: command.limit,
      after: command.after,
      before: command.before,
      sortDirection: command.orderDirection === DirectionEnum.ASC ? 1 : -1,
      sortBy: command.orderBy || '_id',
      includeCursor: command.includeCursor,
      name: command.name,
    });

    return {
      data: pagination.domains.map(toDomainResponse),
      next: pagination.next,
      previous: pagination.previous,
      totalCount: pagination.totalCount,
      totalCountCapped: pagination.totalCountCapped,
    };
  }
}
