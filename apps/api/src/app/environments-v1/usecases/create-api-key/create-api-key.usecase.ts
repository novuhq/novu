import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { decryptApiKey, encryptApiKey, FeatureFlagsService } from '@novu/application-generic';
import { EnvironmentRepository } from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { createHash } from 'crypto';
import { ApiKeyDto } from '../../dtos/api-key.dto';
import { GenerateUniqueApiKey } from '../generate-unique-api-key/generate-unique-api-key.usecase';
import { GetApiKeysCommand } from '../get-api-keys/get-api-keys.command';

export const MAX_API_KEYS_PER_ENVIRONMENT = 2;

@Injectable()
export class CreateApiKey {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private generateUniqueApiKey: GenerateUniqueApiKey,
    private featureFlagsService: FeatureFlagsService
  ) {}

  async execute(command: GetApiKeysCommand): Promise<ApiKeyDto[]> {
    const isMultipleSecretKeysAllowed = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_MULTIPLE_SECRET_KEYS_ALLOWED,
      organization: { _id: command.organizationId },
      user: { _id: command.userId },
      environment: { _id: command.environmentId },
      defaultValue: false,
    });

    if (!isMultipleSecretKeysAllowed) {
      throw new ForbiddenException('Creating additional API keys is not enabled for your organization');
    }

    const environment = await this.environmentRepository.findOne({ _id: command.environmentId });

    if (!environment) {
      throw new NotFoundException(`Environment id: ${command.environmentId} not found`);
    }

    const key = await this.generateUniqueApiKey.execute();
    const encryptedApiKey = encryptApiKey(key);
    const hashedApiKey = createHash('sha256').update(key).digest('hex');

    /*
     * The cap is enforced atomically in the update predicate so concurrent
     * requests cannot push the environment above the maximum.
     */
    const apiKeys = await this.environmentRepository.addApiKey(
      command.environmentId,
      encryptedApiKey,
      command.userId,
      hashedApiKey,
      MAX_API_KEYS_PER_ENVIRONMENT
    );

    if (apiKeys === null) {
      throw new BadRequestException(
        `Environment can have a maximum of ${MAX_API_KEYS_PER_ENVIRONMENT} API keys. Delete an existing key before creating a new one.`
      );
    }

    return apiKeys.map((item) => {
      const decryptedKey = decryptApiKey(item.key);

      return {
        _userId: item._userId,
        key: decryptedKey,
        hash: item.hash ?? createHash('sha256').update(decryptedKey).digest('hex'),
      };
    });
  }
}
