import { Injectable, NotFoundException } from '@nestjs/common';
import { AgentRepository, DomainRepository, DomainRouteRepository } from '@novu/dal';
import { DomainRouteTypeEnum } from '@novu/shared';
import { DomainRouteResponseDto } from '../../dtos/domain-route-response.dto';
import { toDomainRouteResponse } from '../../mappers/domain-route-response.mapper';
import { assertAgentDestination, resolveAgentIdentifier, resolveDomainName } from '../domain-route.utils';
import { UpdateDomainRouteCommand } from './update-domain-route.command';

@Injectable()
export class UpdateDomainRoute {
  constructor(
    private readonly domainRepository: DomainRepository,
    private readonly domainRouteRepository: DomainRouteRepository,
    private readonly agentRepository: AgentRepository
  ) {}

  async execute(command: UpdateDomainRouteCommand): Promise<DomainRouteResponseDto> {
    const domain = await resolveDomainName({
      domainRepository: this.domainRepository,
      domain: command.domain,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    const currentRoute = await this.domainRouteRepository.findOneByAddressAndDomain(
      command.address,
      domain._id,
      command.environmentId,
      command.organizationId
    );

    if (!currentRoute) {
      throw new NotFoundException(`Route "${command.address}@${domain.name}" not found.`);
    }

    const nextType = command.type ?? currentRoute.type;
    const resolvedDestination =
      command.agentId !== undefined
        ? await resolveAgentIdentifier({
            agentRepository: this.agentRepository,
            identifier: command.agentId,
            environmentId: command.environmentId,
            organizationId: command.organizationId,
          })
        : undefined;
    const nextDestination = command.agentId !== undefined ? resolvedDestination : currentRoute.destination;

    await assertAgentDestination({
      agentRepository: this.agentRepository,
      destination: nextDestination,
      type: nextType,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    const hasChanges =
      command.type !== undefined || command.agentId !== undefined || command.data !== undefined;

    if (!hasChanges) {
      return toDomainRouteResponse(currentRoute);
    }

    const updated = await this.domainRouteRepository.findOneAndUpdate(
      {
        _id: currentRoute._id,
        _domainId: domain._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      {
        $set: {
          ...(command.type !== undefined ? { type: command.type } : {}),
          ...(nextType === DomainRouteTypeEnum.AGENT && command.agentId !== undefined
            ? { destination: resolvedDestination }
            : {}),
          ...(command.data !== undefined ? { data: command.data } : {}),
        },
        ...(nextType === DomainRouteTypeEnum.WEBHOOK ? { $unset: { destination: '' } } : {}),
      },
      { new: true }
    );

    if (!updated) {
      throw new NotFoundException(`Route "${command.address}@${domain.name}" not found.`);
    }

    return toDomainRouteResponse(updated);
  }
}
