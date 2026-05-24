import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { assertSafeOutboundUrl, resolvePublicAddresses, SsrfBlockedError } from '@novu/application-generic';
import { EnvironmentEntity, EnvironmentRepository } from '@novu/dal';
import { EnvironmentEnum, PROTECTED_ENVIRONMENTS } from '@novu/shared';
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

    // Prevent renaming Development or Production environments
    if (command.name && command.name !== '' && PROTECTED_ENVIRONMENTS.includes(environment.name as EnvironmentEnum)) {
      throw new UnprocessableEntityException('Cannot update the name of Development or Production environments');
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
      const bridgeUrl = command.bridge?.url || '';

      if (bridgeUrl) {
        await this.assertSafeBridgeUrl(bridgeUrl);
      }

      updatePayload['echo.url'] = bridgeUrl;
      updatePayload['bridge.url'] = bridgeUrl;
    }

    return await this.environmentRepository.update(
      {
        _id: command.environmentId,
        _organizationId: command.organizationId,
      },
      { $set: updatePayload }
    );
  }

  // Persisted bridge URLs are later used by the worker for EXTERNAL-origin
  // workflow EXECUTE calls. Reject SSRF candidates before they are stored so
  // an environment write cannot repoint outbound bridge traffic at internal
  // hosts (loopback, RFC1918, link-local metadata, embedded credentials).
  private async assertSafeBridgeUrl(bridgeUrl: string): Promise<void> {
    try {
      const parsed = assertSafeOutboundUrl(bridgeUrl);
      await resolvePublicAddresses(parsed.hostname, { useCache: true });
    } catch (err) {
      if (err instanceof SsrfBlockedError) {
        throw new BadRequestException(`bridge.url: ${err.message}`);
      }
      throw err;
    }
  }
}
