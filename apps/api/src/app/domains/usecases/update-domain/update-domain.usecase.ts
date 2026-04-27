import { Injectable, NotFoundException } from '@nestjs/common';
import { DomainRepository } from '@novu/dal';

import { DomainResponseDto } from '../../dtos/domain-response.dto';
import { toDomainResponse } from '../../mappers/domain-response.mapper';
import { buildExpectedDnsRecords } from '../../utils/dns-records';
import { UpdateDomainCommand } from './update-domain.command';

@Injectable()
export class UpdateDomain {
  constructor(private readonly domainRepository: DomainRepository) {}

  async execute(command: UpdateDomainCommand): Promise<DomainResponseDto> {
    const domain = await this.domainRepository.findOneByIdAndEnvironment(
      command.domainId,
      command.environmentId,
      command.organizationId
    );

    if (!domain) {
      throw new NotFoundException(`Domain with id "${command.domainId}" not found.`);
    }

    return {
      ...toDomainResponse(domain),
      expectedDnsRecords: buildExpectedDnsRecords(domain.name),
    };
  }
}
