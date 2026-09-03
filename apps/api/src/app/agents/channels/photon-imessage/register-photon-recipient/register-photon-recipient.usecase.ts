import { Injectable } from '@nestjs/common';
import { decryptCredentials, InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';

import { resolveAgentIntegrationForWebhook } from '../../shared/resolve-agent-integration-webhook.util';
import { createPhotonSharedUser } from '../shared/photon-webhook-client';
import { RegisterPhotonRecipientCommand } from './register-photon-recipient.command';

export interface RegisterPhotonRecipientResult {
  success: boolean;
  /** The shared-pool number Photon assigned to this recipient — the number they text to opt in. */
  assignedPhoneNumber?: string;
  /** True when an email was supplied, which makes Photon send an opt-in invite. */
  inviteSent?: boolean;
  message?: string;
}

/**
 * Registers a recipient phone number on the integration's Photon project
 * shared iMessage line. Outbound sends on the shared line only work toward
 * registered + opted-in recipients (and dedicated-line outbound is capped
 * without registration), so the dashboard exposes this as a deliberate
 * pre-registration step — including the invite email, which the send path
 * intentionally never triggers on its own.
 */
@Injectable()
export class RegisterPhotonRecipient {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: RegisterPhotonRecipientCommand): Promise<RegisterPhotonRecipientResult> {
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

    const credentials = decryptCredentials(integration.credentials ?? {});
    const projectId = typeof credentials.apiKey === 'string' ? credentials.apiKey.trim() : '';
    const projectSecret = typeof credentials.secretKey === 'string' ? credentials.secretKey.trim() : '';

    if (!projectId || !projectSecret) {
      return {
        success: false,
        message: 'Save the Project ID and Project Secret before registering recipients.',
      };
    }

    try {
      const user = await createPhotonSharedUser(
        { projectId, projectSecret },
        { phoneNumber: command.phoneNumber, ...(command.email ? { email: command.email } : {}) }
      );

      return {
        success: true,
        assignedPhoneNumber: user.assignedPhoneNumber,
        inviteSent: Boolean(command.email),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn({ err, integrationId: integration._id }, 'Photon recipient registration failed');

      return {
        success: false,
        message: `Photon could not register the recipient (${message}).`,
      };
    }
  }
}
