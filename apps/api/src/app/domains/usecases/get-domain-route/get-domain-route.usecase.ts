import { Injectable, NotFoundException } from '@nestjs/common';
import { DomainRepository, DomainRouteRepository } from '@novu/dal';
import { DomainRouteResponseDto } from '../../dtos/domain-route-response.dto';
import { toDomainRouteResponse } from '../../mappers/domain-route-response.mapper';
import { assertDomainExists } from '../domain-route.utils';
import { GetDomainRouteCommand } from './get-domain-route.command';

@Injectable()
export class GetDomainRoute {
  constructor(
    private readonly domainRepository: DomainRepository,
    private readonly domainRouteRepository: DomainRouteRepository
  ) {}

  async execute(command: GetDomainRouteCommand): Promise<DomainRouteResponseDto> {
    await assertDomainExists({
      domainRepository: this.domainRepository,
      domainId: command.domainId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    const route = await this.domainRouteRepository.findOneByIdAndDomain(
      command.routeId,
      command.domainId,
      command.environmentId,
      command.organizationId
    );

    if (!route) {
      throw new NotFoundException(`Domain route with id "${command.routeId}" not found.`);
    }

    return toDomainRouteResponse(route);
  }
}
