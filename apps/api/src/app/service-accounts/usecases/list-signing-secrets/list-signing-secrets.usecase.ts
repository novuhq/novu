import { Injectable } from '@nestjs/common';
import { SigningSecretRepository } from '@novu/dal';
import { SigningSecretStatusEnum, SigningSecretTypeEnum } from '@novu/shared';

import { SigningSecretResponseDto } from '../../dtos';
import { ListSigningSecretsCommand } from './list-signing-secrets.command';

@Injectable()
export class ListSigningSecrets {
  constructor(private readonly signingSecretRepository: SigningSecretRepository) {}

  async execute(command: ListSigningSecretsCommand): Promise<SigningSecretResponseDto[]> {
    const types = command.type
      ? [command.type]
      : [SigningSecretTypeEnum.SUBSCRIBER, SigningSecretTypeEnum.BRIDGE];

    const results: SigningSecretResponseDto[] = [];

    for (const type of types) {
      const secrets = await this.signingSecretRepository.find(
        {
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
          type,
          status: SigningSecretStatusEnum.ACTIVE,
        },
        ['_id', 'type', '_environmentId', 'status', 'expiresAt', 'revokedAt', 'createdAt']
      );

      for (const secret of secrets) {
        results.push({
          _id: secret._id,
          type: secret.type,
          environmentId: secret._environmentId,
          status: secret.status,
          expiresAt: secret.expiresAt,
          revokedAt: secret.revokedAt,
          createdAt: secret.createdAt,
        });
      }
    }

    return results;
  }
}
