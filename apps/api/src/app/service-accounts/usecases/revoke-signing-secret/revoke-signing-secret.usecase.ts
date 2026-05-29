import { Injectable, NotFoundException } from '@nestjs/common';
import { SigningSecretRepository } from '@novu/dal';
import { SigningSecretStatusEnum, SigningSecretTypeEnum } from '@novu/shared';

import { RevokeSigningSecretCommand } from './revoke-signing-secret.command';

@Injectable()
export class RevokeSigningSecret {
  constructor(private readonly signingSecretRepository: SigningSecretRepository) {}

  async execute(command: RevokeSigningSecretCommand): Promise<void> {
    const organizationId = command.organizationId;

    if (!organizationId) {
      throw new NotFoundException('organizationId is required');
    }

    const subscriberSecrets = await this.signingSecretRepository.findActiveByEnvironmentAndType(
      command.environmentId,
      organizationId,
      SigningSecretTypeEnum.SUBSCRIBER
    );
    const bridgeSecrets = await this.signingSecretRepository.findActiveByEnvironmentAndType(
      command.environmentId,
      organizationId,
      SigningSecretTypeEnum.BRIDGE
    );
    const secret = [...subscriberSecrets, ...bridgeSecrets].find((entry) => entry._id === command.signingSecretId);

    if (!secret) {
      throw new NotFoundException('Signing secret not found');
    }

    await this.signingSecretRepository.update(
      {
        _id: command.signingSecretId,
        _environmentId: command.environmentId,
        _organizationId: organizationId,
      },
      {
        $set: {
          status: SigningSecretStatusEnum.REVOKED,
          revokedAt: new Date().toISOString(),
        },
      }
    );
  }
}
