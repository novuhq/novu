import { Injectable } from '@nestjs/common';
import { decryptCredentials, InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';

import {
  isAgentWebhookUrl,
  resolveAgentIntegrationForWebhook,
} from '../../shared/resolve-agent-integration-webhook.util';
import { deleteSendblueReceiveWebhooks } from '../shared/sendblue-webhook-client';
import { RemoveSendblueWebhooksCommand } from './remove-sendblue-webhooks.command';

export interface RemoveSendblueWebhooksResult {
  success: boolean;
  removedWebhookUrls: string[];
  message?: string;
}

@Injectable()
export class RemoveSendblueWebhooks {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: RemoveSendblueWebhooksCommand): Promise<RemoveSendblueWebhooksResult> {
    const { integration } = await resolveAgentIntegrationForWebhook({
      agentRepository: this.agentRepository,
      integrationRepository: this.integrationRepository,
      agentIntegrationRepository: this.agentIntegrationRepository,
      agentIdentifier: command.agentIdentifier,
      integrationIdentifier: command.integrationIdentifier,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      providerId: ChatProviderIdEnum.Sendblue,
      providerLabel: 'Sendblue',
    });

    // Server-side safety: this endpoint can only ever remove Novu-shaped agent webhook URLs, never
    // an arbitrary third-party one, even though it operates on the org's own Sendblue credentials.
    const urlsToRemove = command.webhookUrls.filter((url) => isAgentWebhookUrl(url));

    if (urlsToRemove.length === 0) {
      return {
        success: false,
        removedWebhookUrls: [],
        message: 'None of the supplied webhook URLs look like Novu agent webhooks — nothing was removed.',
      };
    }

    const credentials = decryptCredentials(integration.credentials ?? {});
    const apiKey = typeof credentials.apiKey === 'string' ? credentials.apiKey.trim() : '';
    const secretKey = typeof credentials.secretKey === 'string' ? credentials.secretKey.trim() : '';

    if (!apiKey || !secretKey) {
      return {
        success: false,
        removedWebhookUrls: [],
        message: 'Save the API Key and Secret Key in the credentials form before removing webhooks.',
      };
    }

    try {
      await deleteSendblueReceiveWebhooks({ apiKey, secretKey }, urlsToRemove);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn({ err, integrationId: integration._id }, 'Sendblue remove-webhooks: deletion failed');

      return {
        success: false,
        removedWebhookUrls: [],
        message: `Could not remove the webhook(s) from Sendblue (${message}).`,
      };
    }

    return { success: true, removedWebhookUrls: urlsToRemove };
  }
}
