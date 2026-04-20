import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DomainRepository } from '@novu/dal';
import { DomainRouteTypeEnum } from '@novu/shared';

import { DomainResponseDto } from '../../dtos/domain-response.dto';
import { toDomainResponse } from '../../mappers/domain-response.mapper';
import { buildExpectedDnsRecords } from '../../utils/dns-records';
import { UpdateRouteCommand } from './update-route.command';

@Injectable()
export class UpdateRoute {
  constructor(private readonly domainRepository: DomainRepository) {}

  async execute(command: UpdateRouteCommand): Promise<DomainResponseDto> {
    const domain = await this.domainRepository.findOneByIdAndEnvironment(
      command.domainId,
      command.environmentId,
      command.organizationId
    );

    if (!domain) {
      throw new NotFoundException(`Domain with id "${command.domainId}" not found.`);
    }

    if (command.routeIndex >= domain.routes.length) {
      throw new BadRequestException(`Route index ${command.routeIndex} is out of bounds.`);
    }

    const existingRoute = domain.routes[command.routeIndex];
    const effectiveType = command.type ?? existingRoute.type;
    const effectiveDestination = command.destination ?? existingRoute.destination;

    if (effectiveType === DomainRouteTypeEnum.AGENT && !effectiveDestination) {
      throw new BadRequestException('destination is required for agent routes.');
    }

    const effectiveAddress = command.address ?? existingRoute.address;
    const duplicate = domain.routes.some(
      (r, i) => i !== command.routeIndex && r.address === effectiveAddress && r.type === effectiveType
    );

    if (duplicate) {
      throw new ConflictException(
        `A ${effectiveType} route for address "${effectiveAddress}" already exists on this domain.`
      );
    }

    const setPayload: Record<string, unknown> = {};

    if (command.address !== undefined) {
      setPayload[`routes.${command.routeIndex}.address`] = command.address;
    }
    if (command.destination !== undefined) {
      setPayload[`routes.${command.routeIndex}.destination`] = command.destination;
    }
    if (command.type !== undefined) {
      setPayload[`routes.${command.routeIndex}.type`] = command.type;
    }

    await this.domainRepository.update(
      {
        _id: command.domainId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      { $set: setPayload }
    );

    const updated = await this.domainRepository.findOneByIdAndEnvironment(
      command.domainId,
      command.environmentId,
      command.organizationId
    );

    return {
      ...toDomainResponse(updated!),
      expectedDnsRecords: buildExpectedDnsRecords(updated!.name),
    };
  }
}
