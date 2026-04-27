import { Injectable } from '@nestjs/common';
import { AgentRepository, DomainRepository, DomainRouteRepository } from '@novu/dal';
import { DomainRouteTypeEnum } from '@novu/shared';
import { DomainRouteResponseDto } from '../../dtos/domain-route-response.dto';
import { toDomainRouteResponse } from '../../mappers/domain-route-response.mapper';
import {
  assertAgentDestination,
  isDuplicateKeyError,
  resolveAgentIdentifier,
  resolveDomainName,
  toDuplicateRouteConflict,
} from '../domain-route.utils';
import { CreateDomainRouteCommand } from './create-domain-route.command';

@Injectable()
export class CreateDomainRoute {
  constructor(
    private readonly domainRepository: DomainRepository,
    private readonly domainRouteRepository: DomainRouteRepository,
    private readonly agentRepository: AgentRepository
  ) {}

  async execute(command: CreateDomainRouteCommand): Promise<DomainRouteResponseDto> {
    const domain = await resolveDomainName({
      domainRepository: this.domainRepository,
      domain: command.domain,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    const destination =
      command.type === DomainRouteTypeEnum.AGENT && command.agentId
        ? await resolveAgentIdentifier({
            agentRepository: this.agentRepository,
            identifier: command.agentId,
            environmentId: command.environmentId,
            organizationId: command.organizationId,
          })
        : undefined;

    await assertAgentDestination({
      agentRepository: this.agentRepository,
      destination,
      type: command.type,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    const existingRoute = await this.domainRouteRepository.findOneByAddressAndDomain(
      command.address,
      domain._id,
      command.environmentId,
      command.organizationId
    );

    if (existingRoute) {
      throw toDuplicateRouteConflict(command.address, domain.name);
    }

    try {
      const route = await this.domainRouteRepository.create({
        _domainId: domain._id,
        address: command.address,
        ...(command.type === DomainRouteTypeEnum.AGENT && destination ? { destination } : {}),
        type: command.type,
        ...(command.data !== undefined ? { data: command.data } : {}),
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      });

      return toDomainRouteResponse(route);
    } catch (err: unknown) {
      if (isDuplicateKeyError(err)) {
        throw toDuplicateRouteConflict(command.address, domain.name);
      }

      throw err;
    }
  }
}
