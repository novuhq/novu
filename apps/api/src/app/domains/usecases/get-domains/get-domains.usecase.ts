import { Injectable } from '@nestjs/common';
import { DomainRepository } from '@novu/dal';

import { DomainResponseDto } from '../../dtos/domain-response.dto';
import { toDomainResponse } from '../../mappers/domain-response.mapper';
import { GetDomainsCommand } from './get-domains.command';

@Injectable()
export class GetDomains {
  constructor(private readonly domainRepository: DomainRepository) {}

  async execute(command: GetDomainsCommand): Promise<DomainResponseDto[]> {
    const domains = await this.domainRepository.findByEnvironment(command.environmentId, command.organizationId);

    return domains.map(toDomainResponse);
  }
}
