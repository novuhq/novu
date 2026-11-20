import { BadRequestException, Injectable } from '@nestjs/common';
import { EnvironmentRepository, IntegrationEntity } from '@novu/dal';
import { ContextPayload } from '@novu/shared';
import { ApiKeyRevocationService } from '../../../auth/api-key-revocation/api-key-revocation.service';
import { validateContextHmacEncryption } from '../../../inbox/utils/encryption';

/**
 * Establishes connect-time trust for the context/tenant binding that a
 * distributed chat agent is about to persist. When the integration has HMAC
 * validation enabled, the browser-supplied `context` must be provably minted by
 * an authenticated backend rather than forged — otherwise any end-user could
 * claim a sibling tenant. We reuse Novu's existing "Inbox with context" HMAC
 * (`contextHash = HMAC-SHA256(envSecretKey, canonicalize(context))`): the same
 * primitive enforced at the Inbox session mint, now extended to the connect/link
 * OAuth flow.
 *
 * Trust is skipped in two cases: the integration does not have HMAC enabled
 * (regular integrations keep working without a signature), or the session
 * already HMAC-verified an equivalent context (`isContextValidated`), so
 * re-verification would be redundant.
 */
@Injectable()
export class ConnectContextVerifier {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private apiKeyRevocationService: ApiKeyRevocationService
  ) {}

  async verify(params: {
    integration: IntegrationEntity;
    context?: ContextPayload;
    contextHash?: string;
    isContextValidated?: boolean;
  }): Promise<void> {
    const { integration, context, contextHash, isContextValidated } = params;

    if (!integration.credentials?.hmac) {
      return;
    }

    // The Inbox session already HMAC-verified this context against its own
    // environment; the same authenticated session is making this call, so trust
    // it rather than demanding a second signature.
    if (isContextValidated) {
      return;
    }

    if (!context) {
      throw new BadRequestException('A context is required when HMAC validation is enabled.');
    }

    if (!contextHash) {
      throw new BadRequestException('A valid contextHash is required when HMAC validation is enabled.');
    }

    const apiKeys = await this.getSigningKeys(integration);

    // Throws BadRequestException on mismatch; rotation-safe + timing-safe.
    validateContextHmacEncryption({ apiKeys, context, contextHash });
  }

  private async getSigningKeys(integration: IntegrationEntity): Promise<string[]> {
    const environmentId = integration._environmentId;
    const apiKeys = await this.environmentRepository.getApiKeys(environmentId);

    if (!apiKeys.length) {
      throw new BadRequestException(`Environment ID: ${environmentId} not found`);
    }

    return this.apiKeyRevocationService.getSigningKeys({
      organizationId: integration._organizationId,
      environmentId,
      apiKeys,
    });
  }
}
