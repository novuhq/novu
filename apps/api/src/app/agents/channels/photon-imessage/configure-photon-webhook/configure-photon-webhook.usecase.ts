import { Injectable } from '@nestjs/common';
import { decryptCredentials, encryptSecret, InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';

import {
  isAgentWebhookUrl,
  resolveAgentIntegrationForWebhook,
} from '../../shared/resolve-agent-integration-webhook.util';
import {
  createPhotonWebhook,
  deletePhotonWebhooks,
  enablePhotonImessagePlatform,
  listPhotonWebhooks,
} from '../shared/photon-webhook-client';
import { ConfigurePhotonWebhookCommand } from './configure-photon-webhook.command';

export type ConfigurePhotonWebhookFailure = {
  code: 'missing_credentials' | 'photon_rejected' | 'unknown';
  message: string;
};

export interface ConfigurePhotonWebhookResult {
  success: boolean;
  callbackUrl: string;
  fallbackToManual?: boolean;
  reason?: ConfigurePhotonWebhookFailure;
  /**
   * Other Novu agent webhook URLs found registered on this Photon project (e.g. from a different
   * agent, integration, or environment sharing the same project credentials). Every inbound
   * message is delivered to all of the project's webhooks — the dashboard surfaces these so the
   * user can remove the stale ones.
   */
  existingNovuWebhookUrls?: string[];
}

@Injectable()
export class ConfigurePhotonWebhook {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: ConfigurePhotonWebhookCommand): Promise<ConfigurePhotonWebhookResult> {
    const { agent, integration, callbackUrl } = await resolveAgentIntegrationForWebhook({
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

    const credentials = decryptCredentials(integration.credentials ?? {});

    const projectId = typeof credentials.apiKey === 'string' ? credentials.apiKey.trim() : '';
    const projectSecret = typeof credentials.secretKey === 'string' ? credentials.secretKey.trim() : '';

    if (!projectId || !projectSecret) {
      return {
        success: false,
        callbackUrl,
        fallbackToManual: true,
        reason: {
          code: 'missing_credentials',
          message: 'Save the Project ID and Project Secret in the credentials form before configuring the webhook.',
        },
      };
    }

    const existingSecret = typeof credentials.token === 'string' ? credentials.token.trim() : '';
    const photonCredentials = { projectId, projectSecret };
    let existingNovuWebhookUrls: string[] = [];
    let deletedOwnRegistration = false;

    try {
      // Token issuance — and therefore every outbound send — 403s until the
      // iMessage platform has been enabled once on the project.
      await enablePhotonImessagePlatform(photonCredentials);

      const existingWebhooks = await listPhotonWebhooks(photonCredentials);
      const ownRegistrations = existingWebhooks.filter((entry) => entry.webhookUrl === callbackUrl);

      existingNovuWebhookUrls = existingWebhooks
        .filter((entry) => entry.webhookUrl !== callbackUrl && isAgentWebhookUrl(entry.webhookUrl))
        .map((entry) => entry.webhookUrl);

      /*
       * Photon issues the signing secret once, at registration, and the list endpoint never
       * returns secrets. When our URL is already registered AND we still hold its secret, the
       * registration is intact — never delete a working registration we could not re-secure.
       * `force` overrides this: the stored secret may be stale (webhook deleted and re-added
       * in the Photon dashboard), and the only way to obtain a fresh one is to re-register.
       */
      if (ownRegistrations.length > 0 && existingSecret && !command.force) {
        return {
          success: true,
          callbackUrl,
          ...(existingNovuWebhookUrls.length > 0 ? { existingNovuWebhookUrls } : {}),
        };
      }

      /*
       * Either we never registered, or we lost the secret for a previous registration (Photon
       * would 409 on a duplicate URL). Delete our stale registration and create a fresh one.
       */
      if (ownRegistrations.length > 0) {
        await deletePhotonWebhooks(
          photonCredentials,
          ownRegistrations.map((entry) => entry.id)
        );
        deletedOwnRegistration = true;
      }

      const createdWebhook = await createPhotonWebhook(photonCredentials, callbackUrl);

      // Photon-issued, returned once — persist immediately or the registration is unverifiable.
      try {
        await this.integrationRepository.update(
          {
            _id: integration._id,
            _environmentId: command.environmentId,
            _organizationId: command.organizationId,
          },
          // The v0 secret: Spectrum production signs deliveries with the native
          // X-Spectrum-Signature scheme only (Standard Webhooks is a future
          // Spectrum refactor; standardSigningSecret is returned but unused).
          { $set: { 'credentials.token': encryptSecret(createdWebhook.signingSecret) } }
        );
      } catch (persistError) {
        /*
         * The secret is lost the moment this scope exits, and Photon 409s on a
         * duplicate URL — an orphaned registration would make the manual-fallback
         * instructions ("add it in the Photon dashboard") impossible to follow.
         * Best-effort delete so both retry and the manual path stay viable.
         */
        await deletePhotonWebhooks(photonCredentials, [createdWebhook.id]).catch((cleanupError) => {
          this.logger.error(
            { err: cleanupError, integrationId: integration._id, webhookId: createdWebhook.id },
            'Photon auto-configure: failed to clean up webhook after secret persistence failed — delete it in the Photon dashboard before reconfiguring'
          );
        });
        throw persistError;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        { err, agentId: agent._id, integrationId: integration._id },
        'Photon auto-configure: webhook registration failed'
      );

      if (deletedOwnRegistration) {
        // The old registration (and its secret) is gone; clearing the stored token
        // keeps the UI showing unconfigured instead of a green state with no webhook.
        await this.integrationRepository
          .update(
            { _id: integration._id, _environmentId: command.environmentId, _organizationId: command.organizationId },
            { $unset: { 'credentials.token': '' } }
          )
          .catch(() => {});
      }

      return {
        success: false,
        callbackUrl,
        fallbackToManual: true,
        reason: {
          code: 'photon_rejected',
          message: `Could not register the webhook with Photon (${message}). Add it manually in the Photon dashboard with the callback URL shown below, then paste the signing secret into the integration credentials.`,
        },
      };
    }

    return {
      success: true,
      callbackUrl,
      ...(existingNovuWebhookUrls.length > 0 ? { existingNovuWebhookUrls } : {}),
    };
  }
}
