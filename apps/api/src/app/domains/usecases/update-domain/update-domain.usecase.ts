import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AgentRepository, DomainRepository } from '@novu/dal';
import { DomainRouteTypeEnum } from '@novu/shared';

import { DomainResponseDto } from '../../dtos/domain-response.dto';
import { toDomainResponse } from '../../mappers/domain-response.mapper';
import { buildExpectedDnsRecords } from '../../utils/dns-records';
import { UpdateDomainCommand } from './update-domain.command';

@Injectable()
export class UpdateDomain {
  constructor(
    private readonly domainRepository: DomainRepository,
    private readonly agentRepository: AgentRepository
  ) {}

  async execute(command: UpdateDomainCommand): Promise<DomainResponseDto> {
    const domain = await this.domainRepository.findOneByIdAndEnvironment(
      command.domainId,
      command.environmentId,
      command.organizationId
    );

    if (!domain) {
      throw new NotFoundException(`Domain with id "${command.domainId}" not found.`);
    }

    if (command.routes !== undefined) {
      for (const route of command.routes) {
        if (route.type === DomainRouteTypeEnum.AGENT && !route.destination) {
          throw new BadRequestException('destination is required for agent routes.');
        }
      }

      const seen = new Set<string>();
      for (const route of command.routes) {
        const key = `${route.address}:${route.type}`;
        if (seen.has(key)) {
          throw new ConflictException(`A ${route.type} route for address "${route.address}" appears more than once.`);
        }
        seen.add(key);
      }

      await this.validateAgentDestinations(command);

      const updated = await this.domainRepository.findOneAndUpdate(
        {
          _id: command.domainId,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        { $set: { routes: command.routes } },
        { new: true }
      );

      if (!updated) {
        throw new NotFoundException(`Domain with id "${command.domainId}" not found.`);
      }

      return {
        ...toDomainResponse(updated),
        expectedDnsRecords: buildExpectedDnsRecords(updated.name),
      };
    }

    return {
      ...toDomainResponse(domain),
      expectedDnsRecords: buildExpectedDnsRecords(domain.name),
    };
  }

  private async validateAgentDestinations(command: UpdateDomainCommand): Promise<void> {
    const agentDestinations = [
      ...new Set(
        command.routes!.filter((r) => r.type === DomainRouteTypeEnum.AGENT && r.destination).map((r) => r.destination!)
      ),
    ];

    if (agentDestinations.length === 0) return;

    const found = await this.agentRepository.find(
      {
        _id: { $in: agentDestinations },
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );

    const foundIds = new Set(found.map((a) => a._id));
    const missing = agentDestinations.filter((id) => !foundIds.has(id));

    if (missing.length > 0) {
      throw new NotFoundException(`Agent(s) ${missing.join(', ')} referenced in route destinations do not exist.`);
    }
  }
}
