import { Injectable, NotFoundException } from '@nestjs/common';
import { DomainRepository } from '@novu/dal';

import { DeleteDomainCommand } from './delete-domain.command';

@Injectable()
export class DeleteDomain {
  constructor(private readonly domainRepository: DomainRepository) {}

  async execute(command: DeleteDomainCommand): Promise<void> {
    const domain = await this.domainRepository.findOneByIdAndEnvironment(
      command.domainId,
      command.environmentId,
      command.organizationId
    );

    if (!domain) {
      throw new NotFoundException(`Domain with id "${command.domainId}" not found.`);
    }

    await this.domainRepository.delete({
      _id: command.domainId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });
  }
}
