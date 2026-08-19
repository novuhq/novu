import { Injectable } from '@nestjs/common';
import { decryptCredentials, InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';

import {
  isAgentWebhookUrl,
  resolveAgentIntegrationForWebhook,
} from '../../shared/resolve-agent-integration-webhook.util';
import { deletePhotonWebhooks, listPhotonWebhooks } from '../shared/photon-webhook-client';
import { RemovePhotonWebhooksCommand } from './remove-photon-webhooks.command';

export interface RemovePhotonWebhooksResult {
  success: boolean;
  removedWebhookUrls: string[];
  message?: string;
}

@Injectable()
export class RemovePhotonWebhooks {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: RemovePhotonWebhooksCommand): Promise<RemovePhotonWebhooksResult> {
    const { integration } = await resolveAgentIntegrationForWebhook({
      agentRepository: this.agentRepository,
      integrationRepository: this.integrationRepository,
      agentIntegrationRepository: this.agentIntegrationRepository,
      agentIdentifier: command.agentIdentifier,
      integrationIdentifier: command.integrationIdentifier,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      providerId: ChatProviderIdEnum.PhotonImessage,
      providerLabel: 'Photon',
    });

    // Server-side safety: this endpoint can only ever remove Novu-shaped agent webhook URLs, never
    // an arbitrary third-party one, even though it operates on the org's own Photon credentials.
    const urlsToRemove = command.webhookUrls.filter((url) => isAgentWebhookUrl(url));

    if (urlsToRemove.length === 0) {
      return {
        success: false,
        removedWebhookUrls: [],
        message: 'None of the supplied webhook URLs look like Novu agent webhooks — nothing was removed.',
      };
    }

    const credentials = decryptCredentials(integration.credentials ?? {});
    const projectId = typeof credentials.apiKey === 'string' ? credentials.apiKey.trim() : '';
    const projectSecret = typeof credentials.secretKey === 'string' ? credentials.secretKey.trim() : '';

    if (!projectId || !projectSecret) {
      return {
        success: false,
        removedWebhookUrls: [],
        message: 'Save the Project ID and Project Secret in the credentials form before removing webhooks.',
      };
    }

    try {
      // Photon deletes by webhook id, so resolve the supplied URLs against the live list first.
      const photonCredentials = { projectId, projectSecret };
      const existingWebhooks = await listPhotonWebhooks(photonCredentials);
      const matched = existingWebhooks.filter((entry) => urlsToRemove.includes(entry.webhookUrl));

      await deletePhotonWebhooks(
        photonCredentials,
        matched.map((entry) => entry.id)
      );

      return { success: true, removedWebhookUrls: matched.map((entry) => entry.webhookUrl) };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn({ err, integrationId: integration._id }, 'Photon remove-webhooks: deletion failed');

      return {
        success: false,
        removedWebhookUrls: [],
        message: `Could not remove the webhook(s) from Photon (${message}).`,
      };
    }
  }
}
