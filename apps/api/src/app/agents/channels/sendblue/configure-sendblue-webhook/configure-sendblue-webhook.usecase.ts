import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { decryptCredentials, encryptSecret, InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';

import {
  isAgentWebhookUrl,
  resolveAgentIntegrationForWebhook,
} from '../../shared/resolve-agent-integration-webhook.util';
import {
  createSendblueReceiveWebhook,
  deleteSendblueReceiveWebhooks,
  listSendblueReceiveWebhooks,
} from '../shared/sendblue-webhook-client';
import { ConfigureSendblueWebhookCommand } from './configure-sendblue-webhook.command';

export type ConfigureSendblueWebhookFailure = {
  code: 'missing_credentials' | 'sendblue_rejected' | 'unknown';
  message: string;
};

export interface ConfigureSendblueWebhookResult {
  success: boolean;
  callbackUrl: string;
  webhookSecret?: string;
  fallbackToManual?: boolean;
  reason?: ConfigureSendblueWebhookFailure;
  /**
   * Other Novu agent webhook URLs found registered on this Sendblue account (e.g. from a
   * different agent, integration, or environment sharing the same Sendblue credentials).
   * Sendblue webhooks are account-level, so every inbound message triggers *all* registered
   * `receive` webhooks — the dashboard surfaces these so the user can remove the stale ones.
   */
  existingNovuWebhookUrls?: string[];
}

@Injectable()
export class ConfigureSendblueWebhook {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: ConfigureSendblueWebhookCommand): Promise<ConfigureSendblueWebhookResult> {
    const { agent, integration, callbackUrl } = await resolveAgentIntegrationForWebhook({
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

    const credentials = decryptCredentials(integration.credentials ?? {});

    const apiKey = typeof credentials.apiKey === 'string' ? credentials.apiKey.trim() : '';
    const secretKey = typeof credentials.secretKey === 'string' ? credentials.secretKey.trim() : '';

    if (!apiKey || !secretKey) {
      return {
        success: false,
        callbackUrl,
        fallbackToManual: true,
        reason: {
          code: 'missing_credentials',
          message: 'Save the API Key and Secret Key in the credentials form before configuring the webhook.',
        },
      };
    }

    /*
     * Reuse an already-provisioned secret so re-running the configure step does not invalidate
     * a webhook previously registered on the Sendblue side with the old secret.
     */
    const existingSecret = typeof credentials.token === 'string' ? credentials.token.trim() : '';
    const webhookSecret = existingSecret || randomBytes(32).toString('hex');

    if (!existingSecret) {
      await this.integrationRepository.update(
        {
          _id: integration._id,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        { $set: { 'credentials.token': encryptSecret(webhookSecret) } }
      );
    }

    let existingNovuWebhookUrls: string[] = [];

    try {
      const sendblueCredentials = { apiKey, secretKey };
      const existingWebhooks = await listSendblueReceiveWebhooks(sendblueCredentials);

      // Sendblue webhooks are account-level: every line on the account shares the same `receive`
      // webhook list, and every inbound message triggers *all* of them. A previous registration of
      // this exact integration's URL (e.g. from an earlier "Reconfigure webhook" click, or a retry
      // after a secret rotation) must be deleted first so create() replaces it instead of appending
      // a duplicate that would double-dispatch every future inbound message.
      const ownPreviousUrls = existingWebhooks.filter((entry) => entry.url === callbackUrl).map((entry) => entry.url);

      existingNovuWebhookUrls = existingWebhooks
        .filter((entry) => entry.url !== callbackUrl && isAgentWebhookUrl(entry.url))
        .map((entry) => entry.url);

      if (ownPreviousUrls.length > 0) {
        await deleteSendblueReceiveWebhooks(sendblueCredentials, ownPreviousUrls);
      }

      await createSendblueReceiveWebhook(sendblueCredentials, { url: callbackUrl, secret: webhookSecret });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        { err, agentId: agent._id, integrationId: integration._id },
        'Sendblue auto-configure: webhook registration failed'
      );

      return {
        success: false,
        callbackUrl,
        webhookSecret,
        fallbackToManual: true,
        reason: {
          code: 'sendblue_rejected',
          message: `Could not register the webhook with Sendblue (${message}). Add it manually in the Sendblue dashboard with the callback URL and secret shown below.`,
        },
      };
    }

    return {
      success: true,
      callbackUrl,
      webhookSecret,
      ...(existingNovuWebhookUrls.length > 0 ? { existingNovuWebhookUrls } : {}),
    };
  }
}
