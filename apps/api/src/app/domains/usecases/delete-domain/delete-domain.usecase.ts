import { Injectable } from '@nestjs/common';
import { DomainRepository, DomainRouteRepository } from '@novu/dal';

import { resolveDomainName } from '../domain-route.utils';
import { DeleteDomainCommand } from './delete-domain.command';

@Injectable()
export class DeleteDomain {
  constructor(
    private readonly domainRepository: DomainRepository,
    private readonly domainRouteRepository: DomainRouteRepository
  ) {}

  async execute(command: DeleteDomainCommand): Promise<void> {
    const domain = await resolveDomainName({
      domainRepository: this.domainRepository,
      domain: command.domain,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    await this.domainRepository.delete({
      _id: domain._id,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });
    await this.domainRouteRepository.delete({
      _domainId: domain._id,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });
  }
}
