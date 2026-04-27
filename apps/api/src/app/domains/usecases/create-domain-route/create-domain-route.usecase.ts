import { Injectable } from '@nestjs/common';
import { AgentRepository, DomainRepository, DomainRouteRepository } from '@novu/dal';
import { DomainRouteTypeEnum } from '@novu/shared';
import { DomainRouteResponseDto } from '../../dtos/domain-route-response.dto';
import { toDomainRouteResponse } from '../../mappers/domain-route-response.mapper';
import {
  assertAgentDestination,
  assertDomainExists,
  isDuplicateKeyError,
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
    await assertDomainExists({
      domainRepository: this.domainRepository,
      domainId: command.domainId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });
    await assertAgentDestination({
      agentRepository: this.agentRepository,
      destination: command.destination,
      type: command.type,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    try {
      const route = await this.domainRouteRepository.create({
        _domainId: command.domainId,
        address: command.address,
        ...(command.type === DomainRouteTypeEnum.AGENT && command.destination
          ? { destination: command.destination }
          : {}),
        type: command.type,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      });

      return toDomainRouteResponse(route);
    } catch (err: unknown) {
      if (isDuplicateKeyError(err)) {
        throw toDuplicateRouteConflict(command.address, command.type);
      }

      throw err;
    }
  }
}
