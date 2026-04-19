import { Injectable } from '@nestjs/common';
import { DomainRepository, OrganizationRepository } from '@novu/dal';
import { DomainStatusEnum } from '@novu/shared';

import { DomainResponseDto } from '../../dtos/domain-response.dto';
import { toDomainResponse } from '../../mappers/domain-response.mapper';
import { getMailServerDomain } from '../../utils/dns-records';
import { GetDomainsCommand } from './get-domains.command';

@Injectable()
export class GetDomains {
  constructor(
    private readonly domainRepository: DomainRepository,
    private readonly organizationRepository: OrganizationRepository
  ) {}

  async execute(command: GetDomainsCommand): Promise<DomainResponseDto[]> {
    const domains = await this.domainRepository.findByEnvironment(command.environmentId, command.organizationId);

    if (domains.length === 0 && process.env.IS_SELF_HOSTED !== 'true') {
      const demoDomain = await this.getOrCreateDemoDomain(command);
      if (demoDomain) {
        return [toDomainResponse(demoDomain)];
      }
    }

    return domains.map(toDomainResponse);
  }

  private async getOrCreateDemoDomain(command: GetDomainsCommand) {
    const demoDomainName = getMailServerDomain();
    if (!demoDomainName) {
      return null;
    }

    const organization = await this.organizationRepository.findById(command.organizationId, 'name');
    if (!organization) {
      return null;
    }

    const existing = await this.domainRepository.findOne(
      {
        name: demoDomainName,
        _organizationId: command.organizationId,
      },
      '*'
    );

    if (existing) {
      return existing;
    }

    return this.domainRepository.create({
      name: demoDomainName,
      status: DomainStatusEnum.VERIFIED,
      mxRecordConfigured: true,
      routes: [],
      _organizationId: command.organizationId,
    });
  }
}
