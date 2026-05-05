import { BadGatewayException, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import { ChannelConnectionRepository, ChannelEndpointRepository, IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum, ENDPOINT_TYPES } from '@novu/shared';
import axios, { AxiosError } from 'axios';

import { SendAgentDmCommand } from './send-agent-dm.command';

@Injectable()
export class SendAgentDm {
  private readonly SLACK_POST_MESSAGE_URL = 'https://slack.com/api/chat.postMessage';

  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly channelConnectionRepository: ChannelConnectionRepository,
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(SendAgentDm.name);
  }

  @InstrumentUsecase()
  async execute(command: SendAgentDmCommand): Promise<{ success: boolean }> {
    const integration = await this.integrationRepository.findOne({
      identifier: command.integrationIdentifier,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      channel: ChannelTypeEnum.CHAT,
    });

    if (!integration) {
      throw new NotFoundException(`Integration "${command.integrationIdentifier}" not found in this environment`);
    }

    if (integration.providerId !== ChatProviderIdEnum.Slack) {
      throw new BadRequestException(
        `Proactive DM is only supported for Slack integrations (got "${integration.providerId}")`
      );
    }

    const connection = await this.channelConnectionRepository.findOne({
      integrationIdentifier: command.integrationIdentifier,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    if (!connection?.auth?.accessToken) {
      throw new BadRequestException(
        `No active channel connection found for integration "${command.integrationIdentifier}". ` +
          'The workspace must be connected before sending a DM.'
      );
    }

    const endpoint = await this.channelEndpointRepository.findOne({
      subscriberId: command.subscriberId,
      integrationIdentifier: command.integrationIdentifier,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      type: ENDPOINT_TYPES.SLACK_USER,
    });

    if (!endpoint) {
      throw new NotFoundException(
        `No Slack user endpoint found for subscriber "${command.subscriberId}" on integration "${command.integrationIdentifier}". ` +
          'The user must have connected via OAuth before receiving a DM.'
      );
    }

    const slackUserId = (endpoint.endpoint as { userId: string }).userId;

    this.logger.info(
      { integrationIdentifier: command.integrationIdentifier, subscriberId: command.subscriberId },
      'Sending proactive Slack DM'
    );

    await this.postSlackMessage(connection.auth.accessToken, slackUserId, command.markdown);

    return { success: true };
  }

  private async postSlackMessage(accessToken: string, channelOrUserId: string, text: string): Promise<void> {
    try {
      const response = await axios.post<{ ok: boolean; error?: string }>(
        this.SLACK_POST_MESSAGE_URL,
        { channel: channelOrUserId, text },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          timeout: 10_000,
        }
      );

      if (!response.data.ok) {
        throw new BadGatewayException(`Slack API rejected the message: ${response.data.error ?? 'unknown error'}`);
      }
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      const message = error instanceof AxiosError ? (error.response?.data?.error ?? error.message) : String(error);
      throw new BadGatewayException(`Failed to send Slack DM: ${message}`);
    }
  }
}
