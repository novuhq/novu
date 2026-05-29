import { Injectable } from '@nestjs/common';
import { EnvironmentRepository, SigningSecretRepository, SigningSecretStatusEnum } from '@novu/dal';
import { SigningSecretTypeEnum } from '@novu/shared';

import { decryptApiKey } from '../../encryption/encrypt-provider';

@Injectable()
export class SigningSecretResolverService {
  constructor(
    private readonly signingSecretRepository: SigningSecretRepository,
    private readonly environmentRepository: EnvironmentRepository
  ) {}

  async getActiveSubscriberSecrets(environmentId: string, organizationId: string): Promise<string[]> {
    return this.getActiveSecrets(environmentId, organizationId, SigningSecretTypeEnum.SUBSCRIBER);
  }

  async getActiveBridgeSecrets(environmentId: string, organizationId: string): Promise<string[]> {
    return this.getActiveSecrets(environmentId, organizationId, SigningSecretTypeEnum.BRIDGE);
  }

  private async getActiveSecrets(
    environmentId: string,
    organizationId: string,
    type: SigningSecretTypeEnum
  ): Promise<string[]> {
    const signingSecrets = await this.signingSecretRepository.findActiveByEnvironmentAndType(
      environmentId,
      organizationId,
      type
    );

    if (signingSecrets.length > 0) {
      return signingSecrets.map((entry) => decryptApiKey(entry.secret));
    }

    const environment = await this.environmentRepository.findOne(
      {
        _id: environmentId,
        _organizationId: organizationId,
      },
      'apiKeys'
    );

    if (!environment?.apiKeys?.[0]?.key) {
      return [];
    }

    return [decryptApiKey(environment.apiKeys[0].key)];
  }

  async hasMigratedSigningSecrets(environmentId: string, organizationId: string): Promise<boolean> {
    const secrets = await this.signingSecretRepository.findActiveByEnvironmentAndType(
      environmentId,
      organizationId,
      SigningSecretTypeEnum.SUBSCRIBER
    );

    return secrets.length > 0;
  }

  async seedFromLegacyApiKey(environmentId: string, organizationId: string): Promise<void> {
    const environment = await this.environmentRepository.findOne(
      {
        _id: environmentId,
        _organizationId: organizationId,
      },
      'apiKeys'
    );

    if (!environment?.apiKeys?.[0]?.key) {
      return;
    }

    const legacySecret = environment.apiKeys[0].key;
    const hasMigrated = await this.hasMigratedSigningSecrets(environmentId, organizationId);

    if (hasMigrated) {
      return;
    }

    for (const type of [SigningSecretTypeEnum.SUBSCRIBER, SigningSecretTypeEnum.BRIDGE]) {
      await this.signingSecretRepository.create({
        _environmentId: environmentId,
        _organizationId: organizationId,
        type,
        secret: legacySecret,
        status: SigningSecretStatusEnum.ACTIVE,
      });
    }
  }
}
