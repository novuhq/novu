import { BadRequestException, Injectable } from '@nestjs/common';
import {
  decryptApiKey,
  encryptApiKey,
  InMemoryLRUCacheService,
  InMemoryLRUCacheStore,
} from '@novu/application-generic';

import { EnvironmentRepository } from '@novu/dal';
import { createHash } from 'crypto';
import { getBridgeSecretKeysCacheKey } from '../../bridge-secret-keys-cache';
import { ApiKeyDto } from '../../dtos/api-key.dto';
import { GenerateUniqueApiKey } from '../generate-unique-api-key/generate-unique-api-key.usecase';
import { GetApiKeysCommand } from '../get-api-keys/get-api-keys.command';
import { GetApiKeys } from '../get-api-keys/get-api-keys.usecase';

@Injectable()
export class RegenerateApiKeys {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private generateUniqueApiKey: GenerateUniqueApiKey,
    private getApiKeys: GetApiKeys,
    private inMemoryLRUCacheService: InMemoryLRUCacheService
  ) {}

  async execute(command: GetApiKeysCommand): Promise<ApiKeyDto[]> {
    const environment = await this.environmentRepository.findOne({ _id: command.environmentId });

    if (!environment) {
      throw new BadRequestException(`Environment id: ${command.environmentId} not found`);
    }

    // Read before the update: the stored hashes are the auth cache keys of the keys being replaced.
    const replacedKeyHashes = (await this.getApiKeys.execute(command)).flatMap((apiKey) =>
      apiKey.hash ? [apiKey.hash] : []
    );

    const key = await this.generateUniqueApiKey.execute();
    const encryptedApiKey = encryptApiKey(key);
    const hashedApiKey = createHash('sha256').update(key).digest('hex');

    const environments = await this.environmentRepository.updateApiKey(
      command.environmentId,
      encryptedApiKey,
      command.userId,
      hashedApiKey
    );

    this.invalidateReplacedKeys(command.environmentId, replacedKeyHashes);

    return environments.map((item) => {
      return {
        _userId: item._userId,
        key: decryptApiKey(item.key),
        hash: item.hash,
      };
    });
  }

  /**
   * Regenerate replaces every key at once. Without this, this instance keeps
   * authenticating the old keys and verifying bridge requests against them
   * until the cache entries expire, while Novu already signs with the new key
   * only. Other instances converge via the stores' short TTLs.
   */
  private invalidateReplacedKeys(environmentId: string, replacedKeyHashes: string[]): void {
    for (const hash of replacedKeyHashes) {
      this.inMemoryLRUCacheService.invalidate(InMemoryLRUCacheStore.API_KEY_USER, hash);
    }

    this.inMemoryLRUCacheService.invalidate(
      InMemoryLRUCacheStore.VALIDATOR,
      getBridgeSecretKeysCacheKey(environmentId)
    );
  }
}
