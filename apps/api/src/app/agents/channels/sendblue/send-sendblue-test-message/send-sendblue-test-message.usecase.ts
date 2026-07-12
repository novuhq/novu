import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { decryptCredentials, InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository, SubscriberRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';

import { AgentPlatformEnum } from '../../../shared/enums/agent-platform.enum';
import { getWelcomeText } from '../../../shared/util/agent-welcome-text';
import { SendSendblueTestMessageCommand } from './send-sendblue-test-message.command';
import { sendSendblueMessage } from './sendblue-api.utils';

export type SendSendblueTestMessageError = {
  code: 'missing_credentials' | 'invalid_recipient' | 'recipient_not_verified' | 'sendblue_rejected' | 'unknown';
  message: string;
};

export interface SendSendblueTestMessageResult {
  success: boolean;
  messageId?: string;
  error?: SendSendblueTestMessageError;
}

@Injectable()
export class SendAgentSendblueTestMessage {
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
  async execute(command: SendSendblueTestMessageCommand): Promise<SendSendblueTestMessageResult> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: command.agentIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id', 'identifier']
    );

    if (!agent) {
      throw new NotFoundException(`Agent with identifier "${command.agentIdentifier}" was not found.`);
    }

    const integration = await this.integrationRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      identifier: command.integrationIdentifier,
    });

    if (!integration) {
      throw new NotFoundException(`Integration with identifier "${command.integrationIdentifier}" was not found.`);
    }

    if (integration.providerId !== ChatProviderIdEnum.Sendblue) {
      throw new NotFoundException(`Integration "${command.integrationIdentifier}" is not a Sendblue integration.`);
    }

    // Authorization: ensure the integration is actually linked to this agent
    // before sending outbound messages through it. Without this check an
    // `AGENT_WRITE` caller could trigger sends through unrelated Sendblue
    // integrations in the same tenant.
    const agentIntegrationLink = await this.agentIntegrationRepository.findOne(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _agentId: agent._id,
        _integrationId: integration._id,
      },
      ['_id']
    );

    if (!agentIntegrationLink) {
      throw new NotFoundException(
        `Integration "${command.integrationIdentifier}" is not linked to agent "${command.agentIdentifier}".`
      );
    }

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
    const apiKey = typeof credentials.apiKey === 'string' ? credentials.apiKey.trim() : '';
    const secretKey = typeof credentials.secretKey === 'string' ? credentials.secretKey.trim() : '';
    const fromNumber = typeof credentials.from === 'string' ? credentials.from.trim() : '';

    if (!apiKey || !secretKey || !fromNumber) {
      return {
        success: false,
        error: {
          code: 'missing_credentials',
          message: 'Save the API Key, Secret Key, and phone number before sending a test message.',
        },
      };
    }

    let response: Awaited<ReturnType<typeof sendSendblueMessage>>;
    try {
      response = await sendSendblueMessage({
        apiKey,
        secretKey,
        fromNumber,
        to: subscriberPhone,
        content: getWelcomeText(AgentPlatformEnum.SENDBLUE),
      });
    } catch (err) {
      this.logger.warn({ err, integrationId: integration._id }, 'Sendblue test message send failed');

      return {
        success: false,
        error: {
          code: 'unknown',
          message: 'Could not reach Sendblue to send the test message. Try again in a moment.',
        },
      };
    }

    if (response.body.status === 'ERROR' || response.statusCode >= 400) {
      const failure = this.classifySendblueError(response.body, response.statusCode);

      this.logger.warn(
        { integrationId: integration._id, statusCode: response.statusCode, sendblueError: response.body },
        'Sendblue test message: Sendblue rejected send'
      );

      return { success: false, error: failure };
    }

    return { success: true, messageId: response.body.message_handle };
  }

  private classifySendblueError(
    body: { error_code?: number; error_message?: string },
    statusCode: number
  ): SendSendblueTestMessageError {
    const message = body.error_message ?? `Sendblue returned HTTP ${statusCode}`;
    const lowerMessage = message.toLowerCase();

    // On Sendblue's free shared-line plans, a recipient must text the Sendblue
    // number once to be verified as a contact before the account can message
    // them programmatically. Surface this as its own code so the dashboard can
    // prompt the user to text first instead of showing a generic error.
    if (
      lowerMessage.includes('verify') ||
      lowerMessage.includes('verified') ||
      lowerMessage.includes('add-contact') ||
      lowerMessage.includes('not a contact') ||
      lowerMessage.includes('has not messaged') ||
      lowerMessage.includes('never messaged')
    ) {
      return {
        code: 'recipient_not_verified',
        message: `This recipient hasn't messaged your Sendblue number yet (${message}).`,
      };
    }

    if (lowerMessage.includes('number') || lowerMessage.includes('phone')) {
      return {
        code: 'invalid_recipient',
        message: `Sendblue rejected the recipient phone number (${message}). Double-check the number includes the country code.`,
      };
    }

    return { code: 'sendblue_rejected', message };
  }
}
