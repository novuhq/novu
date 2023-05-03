import { Injectable, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { CreateSubscriber, CreateSubscriberCommand, decryptCredentials } from '@novu/application-generic';

import { HandleChatOauthCommand } from './handle-chat-oauth.command';
import {
  IChannelCredentialsCommand,
  UpdateSubscriberChannel,
  UpdateSubscriberChannelCommand,
} from '../update-subscriber-channel';
import { ChannelTypeEnum, EnvironmentRepository, IntegrationEntity, IntegrationRepository } from '@novu/dal';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { ICredentialsDto } from '@novu/shared';
import { OAuthHandlerEnum } from '../../types';

@Injectable()
export class HandleChatOauth {
  readonly SLACK_ACCESS_URL = 'https://slack.com/api/oauth.v2.access';
  readonly SCRIPT_CLOSE_TAB = '<script>window.close();</script>';

  constructor(
    private updateSubscriberChannelUsecase: UpdateSubscriberChannel,
    private integrationRepository: IntegrationRepository,
    private environmentRepository: EnvironmentRepository,
    private createSubscriberUsecase: CreateSubscriber
  ) {}

  async execute(command: HandleChatOauthCommand) {
    const { credentials: integrationCredentials } = await this.getIntegration(command);

    const environment = await this.getEnvironment(command.environmentId);

    const webhookUrl = await this.getWebhook(command, integrationCredentials);

    await this.createSubscriber(environment, command, webhookUrl);

    const redirect = integrationCredentials.redirectUrl != null && integrationCredentials.redirectUrl != '';

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return { redirect, action: redirect ? integrationCredentials.redirectUrl! : this.SCRIPT_CLOSE_TAB };
  }

  private async createSubscriber(environment, command: HandleChatOauthCommand, webhookUrl) {
    await this.createSubscriberUsecase.execute(
      CreateSubscriberCommand.create({
        organizationId: environment._organizationId,
        environmentId: command.environmentId,
        subscriberId: command?.subscriberId,
      })
    );

    const subscriberCredentials: IChannelCredentialsCommand = { webhookUrl: webhookUrl, channel: command.providerId };

    await this.updateSubscriberChannelUsecase.execute(
      UpdateSubscriberChannelCommand.create({
        organizationId: environment._organizationId,
        environmentId: command.environmentId,
        subscriberId: command.subscriberId,
        providerId: command.providerId,
        credentials: subscriberCredentials,
        oauthHandler: OAuthHandlerEnum.NOVU,
      })
    );
  }

  private async getEnvironment(environmentId: string) {
    const environment = await this.environmentRepository.findById(environmentId);

    if (environment == null) {
      throw new NotFoundException(`Environment ID: ${environmentId} not found`);
    }

    return environment;
  }

  private async getWebhook(command: HandleChatOauthCommand, integrationCredentials: ICredentialsDto) {
    const redirectUri =
      process.env.API_ROOT_URL +
      `/v1/subscribers/${command.subscriberId}/${command.providerId}/${command.environmentId}`;

    const body = {
      redirect_uri: redirectUri,
      code: command.providerCode,
      client_id: integrationCredentials.clientId,
      client_secret: integrationCredentials.secretKey,
    };
    const config = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };

    const res = await axios.post(this.SLACK_ACCESS_URL, body, config);
    const webhook = res.data?.incoming_webhook?.url;

    if (res?.data?.ok === false) {
      const metaData = res?.data?.response_metadata?.messages?.join(', ');
      throw new ApiException(
        `Provider ${command.providerId} returned error ${res.data.error}${metaData ? ', metadata:' + metaData : ''}`
      );
    }

    return webhook;
  }

  private async getIntegration(command: HandleChatOauthCommand) {
    const query: Partial<IntegrationEntity> & { _environmentId: string } = {
      _environmentId: command.environmentId,
      channel: ChannelTypeEnum.CHAT,
      providerId: command.providerId,
    };

    const integration = await this.integrationRepository.findOne(query);

    if (integration == null) {
      throw new NotFoundException(
        `Integration in environment ${command.environmentId} was not found, channel: ${ChannelTypeEnum.CHAT}, ` +
          `providerId: ${command.providerId}`
      );
    }

    integration.credentials = decryptCredentials(integration.credentials);

    return { ...integration };
  }
}
