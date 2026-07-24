import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  decryptApiKey,
  FeatureFlagsService,
  InMemoryLRUCacheService,
  InMemoryLRUCacheStore,
} from '@novu/application-generic';
import { EnvironmentRepository, IApiKey } from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { createHash } from 'crypto';
import { DeleteApiKeyCommand } from './delete-api-key.command';

@Injectable()
export class DeleteApiKey {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private featureFlagsService: FeatureFlagsService,
    private inMemoryLRUCacheService: InMemoryLRUCacheService
  ) {}

  async execute(command: DeleteApiKeyCommand): Promise<void> {
    const isMultipleSecretKeysAllowed = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_MULTIPLE_SECRET_KEYS_ALLOWED,
      organization: { _id: command.organizationId },
      user: { _id: command.userId },
      environment: { _id: command.environmentId },
      defaultValue: false,
    });

    if (!isMultipleSecretKeysAllowed) {
      throw new ForbiddenException('Deleting API keys is not enabled for your organization');
    }

    const apiKeys = await this.environmentRepository.getApiKeys(command.environmentId);

    if (apiKeys.length === 0) {
      throw new NotFoundException(`Environment id: ${command.environmentId} has no API keys`);
    }

    const keyToDelete = apiKeys.find((apiKey) => this.getKeyHash(apiKey) === command.hash);

    if (!keyToDelete) {
      throw new NotFoundException('API key not found');
    }

    if (apiKeys.length === 1) {
      throw new BadRequestException('Cannot delete the last remaining API key. Create a new key first.');
    }

    /*
     * The "at least one key must remain" invariant is enforced atomically in
     * the delete predicate, so concurrent deletes cannot empty the array.
     */
    const { matched, modified } = await this.environmentRepository.deleteApiKey(
      command.environmentId,
      keyToDelete.hash ? { hash: keyToDelete.hash } : { key: keyToDelete.key }
    );

    if (matched === 0) {
      throw new BadRequestException('Cannot delete the last remaining API key. Create a new key first.');
    }

    if (modified === 0) {
      throw new NotFoundException('API key not found');
    }

    /*
     * Best-effort invalidation of the local auth cache so the deleted key stops
     * authenticating immediately on this instance. Other instances converge via
     * the store's short TTL.
     */
    this.inMemoryLRUCacheService.invalidate(InMemoryLRUCacheStore.API_KEY_USER, command.hash);
  }

  private getKeyHash(apiKey: IApiKey): string {
    if (apiKey.hash) {
      return apiKey.hash;
    }

    return createHash('sha256').update(decryptApiKey(apiKey.key)).digest('hex');
  }
}
