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

    return {
      ...toDomainResponse(domain),
      expectedDnsRecords: buildExpectedDnsRecords(domain.name),
    };
  }
}
