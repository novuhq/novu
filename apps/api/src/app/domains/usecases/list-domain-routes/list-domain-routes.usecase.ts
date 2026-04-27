import { BadRequestException, Injectable } from '@nestjs/common';
import { AgentRepository, DomainRepository, DomainRouteRepository } from '@novu/dal';
import { DirectionEnum } from '@novu/shared';
import { ListDomainRoutesResponseDto } from '../../dtos/list-domain-routes-response.dto';
import { toDomainRouteResponse } from '../../mappers/domain-route-response.mapper';
import { assertDomainExists, resolveAgentIdentifier } from '../domain-route.utils';
import { ListDomainRoutesCommand } from './list-domain-routes.command';

@Injectable()
export class ListDomainRoutes {
  constructor(
    private readonly domainRepository: DomainRepository,
    private readonly domainRouteRepository: DomainRouteRepository,
    private readonly agentRepository: AgentRepository
  ) {}

  async execute(command: ListDomainRoutesCommand): Promise<ListDomainRoutesResponseDto> {
    if (command.before && command.after) {
      throw new BadRequestException('Cannot specify both "before" and "after" cursors at the same time.');
    }

    if (command.domainId) {
      await assertDomainExists({
        domainRepository: this.domainRepository,
        domainId: command.domainId,
        environmentId: command.user.environmentId,
        organizationId: command.user.organizationId,
      });
    }

    const destination = command.agentId
      ? await resolveAgentIdentifier({
          agentRepository: this.agentRepository,
          identifier: command.agentId,
          environmentId: command.user.environmentId,
          organizationId: command.user.organizationId,
        })
      : undefined;

    const pagination = await this.domainRouteRepository.listRoutes({
      environmentId: command.user.environmentId,
      organizationId: command.user.organizationId,
      domainId: command.domainId,
      destination,
      limit: command.limit,
      after: command.after,
      before: command.before,
      sortDirection: command.orderDirection === DirectionEnum.ASC ? 1 : -1,
      sortBy: command.orderBy || '_id',
      includeCursor: command.includeCursor,
    });

    return {
      data: pagination.routes.map(toDomainRouteResponse),
      next: pagination.next,
      previous: pagination.previous,
      totalCount: pagination.totalCount,
      totalCountCapped: pagination.totalCountCapped,
    };
  }
}
