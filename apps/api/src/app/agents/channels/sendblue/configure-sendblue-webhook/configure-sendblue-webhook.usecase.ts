import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { decryptCredentials, encryptSecret, InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';
import Sendblue from 'sendblue';

import { resolveAgentIntegrationForWebhook } from '../../shared/resolve-agent-integration-webhook.util';
import { ConfigureSendblueWebhookCommand } from './configure-sendblue-webhook.command';

const SENDBLUE_API_TIMEOUT_MS = 10_000;

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

    try {
      await this.registerReceiveWebhook({ apiKey, secretKey, callbackUrl, webhookSecret });
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

    return { success: true, callbackUrl, webhookSecret };
  }

  /**
   * Registers (appends) a `receive` webhook with a per-webhook secret. Sendblue echoes the
   * secret back in the `sb-signing-secret` header on inbound deliveries.
   * @see https://docs.sendblue.com/getting-started/webhooks/
   */
  private async registerReceiveWebhook(params: {
    apiKey: string;
    secretKey: string;
    callbackUrl: string;
    webhookSecret: string;
  }): Promise<void> {
    const client = new Sendblue({
      apiKey: params.apiKey,
      apiSecret: params.secretKey,
      timeout: SENDBLUE_API_TIMEOUT_MS,
      maxRetries: 0,
    });

    // The SDK throws on non-2xx HTTP responses; Sendblue can additionally return
    // HTTP 200 with an in-body error status for validation failures.
    const response = await client.webhooks.create({
      webhooks: [{ url: params.callbackUrl, secret: params.webhookSecret }],
      type: 'receive',
    });

    if (response.status === 'ERROR') {
      throw new Error(response.message || 'Sendblue rejected the webhook registration request');
    }
  }
}
