import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DomainRepository } from '@novu/dal';
import { DomainRouteTypeEnum } from '@novu/shared';

import { DomainResponseDto } from '../../dtos/domain-response.dto';
import { toDomainResponse } from '../../mappers/domain-response.mapper';
import { buildExpectedDnsRecords } from '../../utils/dns-records';
import { CreateRouteCommand } from './create-route.command';

@Injectable()
export class CreateRoute {
  constructor(private readonly domainRepository: DomainRepository) {}

  async execute(command: CreateRouteCommand): Promise<DomainResponseDto> {
    if (command.type === DomainRouteTypeEnum.AGENT && !command.destination) {
      throw new BadRequestException('destination is required for agent routes.');
    }

    const domain = await this.domainRepository.findOneByIdAndEnvironment(
      command.domainId,
      command.environmentId,
      command.organizationId
    );

    if (!domain) {
      throw new NotFoundException(`Domain with id "${command.domainId}" not found.`);
    }

    const duplicate = domain.routes.some((r) => r.address === command.address && r.type === command.type);

    if (duplicate) {
      throw new ConflictException(
        `A ${command.type} route for address "${command.address}" already exists on this domain.`
      );
    }

    const routePayload: { address: string; type: DomainRouteTypeEnum; destination?: string } = {
      address: command.address,
      type: command.type,
    };

    if (command.destination) {
      routePayload.destination = command.destination;
    }

    await this.domainRepository.update(
      {
        _id: command.domainId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      {
        $push: {
          routes: routePayload,
        },
      }
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
