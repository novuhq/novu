import { Injectable } from '@nestjs/common';
import { EnvironmentEntity, EnvironmentRepository } from '@novu/dal';
import { UpdateEnvironmentCommand } from './update-environment.command';

@Injectable()
export class UpdateEnvironment {
  constructor(private environmentRepository: EnvironmentRepository) {}

  async execute(command: UpdateEnvironmentCommand) {
    const updatePayload: Partial<EnvironmentEntity> = {};

    if (command.name && command.name !== '') {
      updatePayload.name = command.name;
    }
    if (command._parentId && command.name !== '') {
      updatePayload._parentId = command._parentId;
    }

    if (command.identifier && command.name !== '') {
      updatePayload.identifier = command.identifier;
    }

    if (command.dns && command.dns.inboundParseDomain !== '') {
      updatePayload[`dns.inboundParseDomain`] = command.dns.inboundParseDomain;
    }

    return await this.environmentRepository.update(
      {
        _id: command.environmentId,
        _organizationId: command.organizationId,
      },
      { $set: updatePayload }
    );
  }
}
