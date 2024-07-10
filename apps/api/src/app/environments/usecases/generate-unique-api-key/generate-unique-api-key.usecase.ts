import * as hat from 'hat';
import { createHash } from 'crypto';
import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { EnvironmentRepository } from '@novu/dal';

const API_KEY_GENERATION_MAX_RETRIES = 3;

@Injectable()
export class GenerateUniqueApiKey {
  constructor(private environmentRepository: EnvironmentRepository) {}

  async execute(): Promise<string> {
    let apiKey = '';
    let count = 0;
    let isApiKeyUsed = true;
    while (isApiKeyUsed) {
      apiKey = this.generateApiKey();
      isApiKeyUsed = await this.validateIsApiKeyUsed(apiKey);
      count += 1;

      if (count === API_KEY_GENERATION_MAX_RETRIES) {
        const errorMessage = 'Clashing of the API key generation';
        throw new InternalServerErrorException(new Error(errorMessage), errorMessage);
      }
    }

    return apiKey as string;
  }

  private async validateIsApiKeyUsed(apiKey: string) {
    const hashedApiKey = createHash('sha256').update(apiKey).digest('hex');

    const environment = await this.environmentRepository.findByApiKey({
      key: apiKey,
      hash: hashedApiKey,
    });

    return !!environment;
  }

  /**
   * Extracting the generation functionality so it can be stubbed for functional testing
   *
   * @requires hat
   * @todo Dependency is no longer accessible to source code due of removal from GitHub. Consider look for an alternative.
   */
  private generateApiKey(): string {
    return hat();
  }
}
