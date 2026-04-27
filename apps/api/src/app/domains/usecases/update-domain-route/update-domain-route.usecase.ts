import { Injectable, NotFoundException } from '@nestjs/common';
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
import { UpdateDomainRouteCommand } from './update-domain-route.command';

@Injectable()
export class UpdateDomainRoute {
  constructor(
    private readonly domainRepository: DomainRepository,
    private readonly domainRouteRepository: DomainRouteRepository,
    private readonly agentRepository: AgentRepository
  ) {}

  async execute(command: UpdateDomainRouteCommand): Promise<DomainRouteResponseDto> {
    await assertDomainExists({
      domainRepository: this.domainRepository,
      domainId: command.domainId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    const currentRoute = await this.domainRouteRepository.findOneByIdAndDomain(
      command.routeId,
      command.domainId,
      command.environmentId,
      command.organizationId
    );

    if (!currentRoute) {
      throw new NotFoundException(`Domain route with id "${command.routeId}" not found.`);
    }

    const nextType = command.type ?? currentRoute.type;
    const nextDestination = command.destination ?? currentRoute.destination;
    await assertAgentDestination({
      agentRepository: this.agentRepository,
      destination: nextDestination,
      type: nextType,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    const hasChanges = command.address !== undefined || command.type !== undefined || command.destination !== undefined;

    if (!hasChanges) {
      return toDomainRouteResponse(currentRoute);
    }

    try {
      const updated = await this.domainRouteRepository.findOneAndUpdate(
        {
          _id: command.routeId,
          _domainId: command.domainId,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        {
          $set: {
            ...(command.address !== undefined ? { address: command.address } : {}),
            ...(command.type !== undefined ? { type: command.type } : {}),
            ...(nextType === DomainRouteTypeEnum.AGENT && command.destination !== undefined
              ? { destination: command.destination }
              : {}),
          },
          ...(nextType === DomainRouteTypeEnum.WEBHOOK ? { $unset: { destination: '' } } : {}),
        },
        { new: true }
      );

      if (!updated) {
        throw new NotFoundException(`Domain route with id "${command.routeId}" not found.`);
      }

      return toDomainRouteResponse(updated);
    } catch (err: unknown) {
      if (isDuplicateKeyError(err)) {
        throw toDuplicateRouteConflict(command.address ?? currentRoute.address, nextType);
      }

      throw err;
    }
  }
}
