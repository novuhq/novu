import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { decryptCredentials, InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository, SubscriberRepository } from '@novu/dal';
import { PhotonImessageChatProvider } from '@novu/providers/dist/cjs/lib/chat/photon-imessage/photon-imessage.provider';
import { ChatProviderIdEnum } from '@novu/shared';
import { ENDPOINT_TYPES, IChatOptions, ISendMessageSuccessResponse } from '@novu/stateless';

import { AgentPlatformEnum } from '../../../shared/enums/agent-platform.enum';
import { getWelcomeText } from '../../../shared/util/agent-welcome-text';
import { resolveAgentIntegrationForWebhook } from '../../shared/resolve-agent-integration-webhook.util';
import { SendPhotonTestMessageCommand } from './send-photon-test-message.command';

export type SendPhotonTestMessageError = {
  code: 'missing_credentials' | 'invalid_recipient' | 'recipient_not_opted_in' | 'photon_rejected' | 'unknown';
  message: string;
};

export interface SendPhotonTestMessageResult {
  success: boolean;
  messageId?: string;
  error?: SendPhotonTestMessageError;
}

@Injectable()
export class SendAgentPhotonTestMessage {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: SendPhotonTestMessageCommand): Promise<SendPhotonTestMessageResult> {
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

    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);

    if (!subscriber) {
      throw new NotFoundException(`Subscriber with id "${command.subscriberId}" was not found.`);
    }

    const subscriberPhone = typeof subscriber.phone === 'string' ? subscriber.phone.trim() : '';

    if (!subscriberPhone) {
      throw new UnprocessableEntityException(
        `Subscriber "${command.subscriberId}" does not have a phone number. Save a phone on the subscriber before sending a test message.`
      );
    }

    const credentials = decryptCredentials(integration.credentials ?? {});
    const projectId = typeof credentials.apiKey === 'string' ? credentials.apiKey.trim() : '';
    const projectSecret = typeof credentials.secretKey === 'string' ? credentials.secretKey.trim() : '';

    if (!projectId || !projectSecret) {
      return {
        success: false,
        error: {
          code: 'missing_credentials',
          message: 'Save the Project ID and Project Secret before sending a test message.',
        },
      };
    }

    const provider = new PhotonImessageChatProvider({ projectId, projectSecret });

    const message: IChatOptions = {
      content: getWelcomeText(AgentPlatformEnum.PHOTON_IMESSAGE),
      channelData: {
        identifier: subscriberPhone,
        type: ENDPOINT_TYPES.PHONE,
        endpoint: { phoneNumber: subscriberPhone },
      },
    };

    let response: ISendMessageSuccessResponse;
    try {
      response = await provider.sendMessage(message);
    } catch (err) {
      this.logger.warn({ err, integrationId: integration._id }, 'Photon test message send failed');

      const failure = this.classifyProviderError(err);

      if (failure) {
        return { success: false, error: failure };
      }

      return {
        success: false,
        error: {
          code: 'unknown',
          message: 'Could not reach Photon to send the test message. Try again in a moment.',
        },
      };
    }

    return { success: true, messageId: response.id };
  }

  private classifyProviderError(err: unknown): SendPhotonTestMessageError | undefined {
    if (!(err instanceof Error) || !err.message) {
      return undefined;
    }

    const { message } = err;
    const lowerMessage = message.toLowerCase();

    /*
     * On Photon's shared iMessage line a recipient must opt in (text the
     * assigned number once, or accept an invite) before the project can
     * message them. The provider surfaces this with a recognizable message —
     * give it its own code so the dashboard can prompt the user to text
     * first instead of showing a generic error.
     */
    if (
      lowerMessage.includes('opted in') ||
      lowerMessage.includes('opt in') ||
      lowerMessage.includes('opt-in') ||
      lowerMessage.includes('assigned photon number')
    ) {
      return { code: 'recipient_not_opted_in', message };
    }

    /*
     * Recipient registration can fail for unrelated reasons (plan cap, outage,
     * bad project credentials) — only advise "check the phone number" when the
     * underlying Photon error actually points at the number. Everything else
     * falls through to photon_rejected so the real message is shown as-is.
     */
    if (lowerMessage.includes('could not register recipient')) {
      const looksLikeBadNumber =
        lowerMessage.includes('e.164') ||
        (lowerMessage.includes('invalid') && (lowerMessage.includes('phone') || lowerMessage.includes('number')));

      if (looksLikeBadNumber) {
        return {
          code: 'invalid_recipient',
          message: `Photon rejected the recipient phone number (${message}). Double-check the number includes the country code.`,
        };
      }

      return { code: 'photon_rejected', message };
    }

    if (lowerMessage.includes('network')) {
      return undefined;
    }

    return { code: 'photon_rejected', message };
  }
}
