import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { decryptApiKey } from '@novu/application-generic';
import { EnvironmentRepository, IApiKey } from '@novu/dal';
import { ApiKeyRevocationService } from '../../../auth/api-key-revocation/api-key-revocation.service';
import { ApiKey } from '../../../shared/dtos/api-key';
import { GetApiKeysCommand } from './get-api-keys.command';

@Injectable()
export class GetApiKeys {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private apiKeyRevocationService: ApiKeyRevocationService
  ) {}

  async execute(command: GetApiKeysCommand): Promise<ApiKey[]> {
    const [keys, revocationPolicy] = await Promise.all([
      this.environmentRepository.getApiKeys(command.environmentId),
      this.apiKeyRevocationService.getPolicy({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
      }),
    ]);

    return keys.map((apiKey: IApiKey) => {
      const decryptedKey = decryptApiKey(apiKey.key);

      return {
        key: decryptedKey,
        _userId: apiKey._userId,
        hash: apiKey.hash ?? createHash('sha256').update(decryptedKey).digest('hex'),
        // Only present while the key has to be replaced, so the answer is unchanged with the policy off.
        ...(this.apiKeyRevocationService.isRotationRequired(revocationPolicy, apiKey) && { requiresRotation: true }),
      };
    });
  }
}
