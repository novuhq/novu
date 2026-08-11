import { BadRequestException, Injectable } from '@nestjs/common';
import { EnvironmentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';
import { isHmacValidForAnyKey } from '../../shared/helpers/is-valid-hmac';

/**
 * Optional Inbox-shaped HMAC gate for the client-supplied agent identifier.
 * Enforced only when the env's `novu-web-chat` integration has `credentials.hmac`.
 * Long-term home is adapter `verifySession` (NV-8448); controller calls this until
 * that hook receives the parsed body.
 */
@Injectable()
export class WebChatAgentHashService {
  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly environmentRepository: EnvironmentRepository
  ) {}

  async assertAgentHashIfRequired({
    agentIdentifier,
    agentHash,
    environmentId,
    organizationId,
  }: {
    agentIdentifier: string;
    agentHash?: string;
    environmentId: string;
    organizationId: string;
  }): Promise<void> {
    const integration = await this.integrationRepository.findOne(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        providerId: ChatProviderIdEnum.NovuWebChat,
      },
      'credentials'
    );

    if (!integration?.credentials?.hmac) {
      return;
    }

    const environment = await this.environmentRepository.findOne(
      { _id: environmentId, _organizationId: organizationId },
      'apiKeys'
    );

    if (!environment?.apiKeys?.length) {
      throw new BadRequestException('Please provide a valid HMAC hash');
    }

    const apiKeys = environment.apiKeys.map((apiKey) => apiKey.key);
    if (!isHmacValidForAnyKey(apiKeys, agentIdentifier, agentHash)) {
      throw new BadRequestException('Please provide a valid HMAC hash');
    }
  }
}
