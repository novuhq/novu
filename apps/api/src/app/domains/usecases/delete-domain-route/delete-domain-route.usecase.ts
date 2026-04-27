import { Injectable, NotFoundException } from '@nestjs/common';
import { DomainRepository, DomainRouteRepository } from '@novu/dal';
import { assertDomainExists } from '../domain-route.utils';
import { DeleteDomainRouteCommand } from './delete-domain-route.command';

@Injectable()
export class DeleteDomainRoute {
  constructor(
    private readonly domainRepository: DomainRepository,
    private readonly domainRouteRepository: DomainRouteRepository
  ) {}

  async execute(command: DeleteDomainRouteCommand): Promise<void> {
    await assertDomainExists({
      domainRepository: this.domainRepository,
      domainId: command.domainId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    const deleted = await this.domainRouteRepository.findOneAndDelete({
      _id: command.routeId,
      _domainId: command.domainId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    if (!deleted) {
      throw new NotFoundException(`Domain route with id "${command.routeId}" not found.`);
    }
  }
}
