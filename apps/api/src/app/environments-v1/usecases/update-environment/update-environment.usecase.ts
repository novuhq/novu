import { Injectable, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { EnvironmentEntity, EnvironmentRepository } from '@novu/dal';
import { PROTECTED_ENVIRONMENTS } from '@novu/shared';
import { UpdateEnvironmentCommand } from './update-environment.command';

@Injectable()
export class UpdateEnvironment {
  constructor(private environmentRepository: EnvironmentRepository) {}

  async execute(command: UpdateEnvironmentCommand) {
    const environment = await this.environmentRepository.findOne({
      _id: command.environmentId,
      _organizationId: command.organizationId,
    });

    if (!environment) {
      throw new UnauthorizedException('Environment not found');
    }

    const updatePayload: Partial<EnvironmentEntity> = {};

    if (command.name && command.name !== '') {
      const normalizedName = command.name.trim();
      if (PROTECTED_ENVIRONMENTS?.map((env) => env.toLowerCase()).includes(normalizedName.toLowerCase())) {
        throw new UnprocessableEntityException('Environment name cannot be Development or Production');
      }

      updatePayload.name = normalizedName;
    }
    if (command._parentId && command.name !== '') {
      updatePayload._parentId = command._parentId;
    }

    if (command.identifier && command.name !== '') {
      updatePayload.identifier = command.identifier;
    }

    if (command.color) {
      updatePayload.color = command.color;
    }

    if (command.dns && command.dns.inboundParseDomain && command.dns.inboundParseDomain !== '') {
      updatePayload[`dns.inboundParseDomain`] = command.dns.inboundParseDomain;
    }

    if (command.bridge) {
      updatePayload['echo.url'] = command.bridge?.url || '';
      updatePayload['bridge.url'] = command.bridge?.url || '';
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
