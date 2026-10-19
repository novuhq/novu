import { Injectable } from '@nestjs/common';
import { DomainRepository } from '@novu/dal';

import { DomainResponseDto } from '../../dtos/domain-response.dto';
import { toDomainResponse } from '../../mappers/domain-response.mapper';
import { buildExpectedDnsRecords } from '../../utils/dns-records';
import { resolveDomainName } from '../domain-route.utils';
import { UpdateDomainCommand } from './update-domain.command';

@Injectable()
export class UpdateDomain {
  constructor(private readonly domainRepository: DomainRepository) {}

  async execute(command: UpdateDomainCommand): Promise<DomainResponseDto> {
    const domain = await resolveDomainName({
      domainRepository: this.domainRepository,
      domain: command.domain,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    if (command.data === undefined) {
      return {
        ...toDomainResponse(domain),
        expectedDnsRecords: buildExpectedDnsRecords(domain.name),
      };
    }

    const updated = await this.domainRepository.findOneAndUpdate(
      {
        _id: domain._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      { $set: { data: command.data } },
      { new: true }
    );

    if (!updated) {
      return {
        ...toDomainResponse(domain),
        expectedDnsRecords: buildExpectedDnsRecords(domain.name),
      };
    }

    return {
      ...toDomainResponse(updated),
      expectedDnsRecords: buildExpectedDnsRecords(updated.name),
    };
  }
}
