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

    if (command.dns && command.dns.inboundParseDomain && command.dns.inboundParseDomain !== '') {
      updatePayload[`dns.inboundParseDomain`] = command.dns.inboundParseDomain;
    }

    if (
      (await this.shouldUpdateEchoConfiguration(command)) &&
      command.bridge &&
      command.bridge.url &&
      command.bridge.url !== ''
    ) {
      updatePayload['echo.url'] = command.bridge.url;
    }

    return await this.environmentRepository.update(
      {
        _id: command.environmentId,
        _organizationId: command.organizationId,
      },
      { $set: updatePayload }
    );
  }
  async shouldUpdateEchoConfiguration(command: UpdateEnvironmentCommand): Promise<boolean> {
    if (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') {
      let name: string;
      if (command.name && command.name !== '') {
        name = command.name;
      } else {
        const env = await this.environmentRepository.findOne({ _id: command.environmentId });

        if (!env) {
          return false;
        }

        name = env.name;
      }

      return name === 'Development';
    } else {
      return false;
    }
  }
}
