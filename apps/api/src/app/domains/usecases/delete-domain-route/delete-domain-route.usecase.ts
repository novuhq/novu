import { Injectable, NotFoundException } from '@nestjs/common';
import { DomainRepository, DomainRouteRepository } from '@novu/dal';
import { resolveDomainName } from '../domain-route.utils';
import { DeleteDomainRouteCommand } from './delete-domain-route.command';

@Injectable()
export class DeleteDomainRoute {
  constructor(
    private readonly domainRepository: DomainRepository,
    private readonly domainRouteRepository: DomainRouteRepository
  ) {}

  async execute(command: DeleteDomainRouteCommand): Promise<void> {
    const domain = await resolveDomainName({
      domainRepository: this.domainRepository,
      domain: command.domain,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    const deleted = await this.domainRouteRepository.findOneAndDelete({
      address: command.address,
      _domainId: domain._id,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    if (!deleted) {
      throw new NotFoundException(`Route "${command.address}@${domain.name}" not found.`);
    }
  }
}
