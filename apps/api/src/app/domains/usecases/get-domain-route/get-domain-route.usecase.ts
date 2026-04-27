import { Injectable, NotFoundException } from '@nestjs/common';
import { DomainRepository, DomainRouteRepository } from '@novu/dal';
import { DomainRouteResponseDto } from '../../dtos/domain-route-response.dto';
import { toDomainRouteResponse } from '../../mappers/domain-route-response.mapper';
import { resolveDomainName } from '../domain-route.utils';
import { GetDomainRouteCommand } from './get-domain-route.command';

@Injectable()
export class GetDomainRoute {
  constructor(
    private readonly domainRepository: DomainRepository,
    private readonly domainRouteRepository: DomainRouteRepository
  ) {}

  async execute(command: GetDomainRouteCommand): Promise<DomainRouteResponseDto> {
    const domain = await resolveDomainName({
      domainRepository: this.domainRepository,
      domain: command.domain,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    const route = await this.domainRouteRepository.findOneByAddressAndDomain(
      command.address,
      domain._id,
      command.environmentId,
      command.organizationId
    );

    if (!route) {
      throw new NotFoundException(`Route "${command.address}@${domain.name}" not found.`);
    }

    return toDomainRouteResponse(route);
  }
}
