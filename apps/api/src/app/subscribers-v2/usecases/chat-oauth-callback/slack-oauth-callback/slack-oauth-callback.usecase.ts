import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { decryptCredentials } from '@novu/application-generic';
import { ChannelTypeEnum, EnvironmentRepository, IntegrationEntity, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';
import axios from 'axios';
import { CreateChannelEndpointCommand } from '../../../../channel-endpoints/usecases/create-channel-endpoint/create-channel-endpoint.command';
import { CreateChannelEndpoint } from '../../../../channel-endpoints/usecases/create-channel-endpoint/create-channel-endpoint.usecase';
import {
  GenerateSlackOauthUrl,
  StateData,
} from '../../generate-chat-oath-url/generate-slack-oath-url/generate-slack-oauth-url.usecase';
import { ChatOauthCallbackResult, ResponseTypeEnum } from '../chat-oauth-callback.response';
import { SlackOauthCallbackCommand } from './slack-oauth-callback.command';

@Injectable()
export class SlackOauthCallback {
  private readonly SLACK_ACCESS_URL = 'https://slack.com/api/oauth.v2.access';
  private readonly SCRIPT_CLOSE_TAB = '<script>window.close();</script>';

  constructor(
    private integrationRepository: IntegrationRepository,
    private environmentRepository: EnvironmentRepository,
    private createChannelEndpoint: CreateChannelEndpoint
  ) {}

  async execute(command: SlackOauthCallbackCommand): Promise<ChatOauthCallbackResult> {
    const stateData = await this.decodeSlackState(command.state);
    const integration = await this.getIntegration(stateData);

    const token = await this.exchangeCodeForToken(command.providerCode, integration);

    await this.createChannelEndpoint.execute(
      CreateChannelEndpointCommand.create({
        organizationId: stateData.organizationId,
        environmentId: stateData.environmentId,
        integrationIdentifier: integration.identifier,
        subscriberId: stateData.subscriberId,
        endpoint: token,
      })
    );

    return {
      type: ResponseTypeEnum.HTML,
      result: this.SCRIPT_CLOSE_TAB,
    };
  }

  private async getIntegration(stateData: StateData): Promise<IntegrationEntity> {
    const query: Partial<IntegrationEntity> & { _environmentId: string } = {
      _environmentId: stateData.environmentId,
      _organizationId: stateData.organizationId,
      channel: ChannelTypeEnum.CHAT,
      providerId: ChatProviderIdEnum.Slack,
      identifier: stateData.integrationIdentifier,
    };

    const integration = await this.integrationRepository.findOne(query);

    if (!integration) {
      throw new NotFoundException(
        `Slack integration not found: ${stateData.integrationIdentifier} in environment ${stateData.environmentId}`
      );
    }

    if (!integration.credentials) {
      throw new NotFoundException(`Slack integration missing credentials in environment ${stateData.environmentId}`);
    }

    if (!integration.credentials.clientId || !integration.credentials.secretKey) {
      throw new NotFoundException(
        `Slack integration missing required OAuth credentials (clientId/clientSecret) in environment ${stateData.environmentId}`
      );
    }

    return integration;
  }

  private async exchangeCodeForToken(providerCode: string, integration: IntegrationEntity): Promise<string> {
    const credentials = decryptCredentials(integration.credentials);

    const body = {
      redirect_uri: GenerateSlackOauthUrl.buildRedirectUri(),
      code: providerCode,
      client_id: credentials.clientId,
      client_secret: credentials.secretKey,
    };

    const config = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };

    const res = await axios.post(this.SLACK_ACCESS_URL, body, config);

    if (res?.data?.ok === false) {
      const metaData = res?.data?.response_metadata?.messages?.join(', ');

      throw new BadRequestException(`Slack OAuth error: ${res.data.error}${metaData ? `, metadata: ${metaData}` : ''}`);
    }

    if (!res.data?.access_token) {
      throw new BadRequestException('Slack did not return an access token');
    }

    return res.data.access_token;
  }

  private async decodeSlackState(state: string): Promise<StateData> {
    try {
      const decoded = Buffer.from(state, 'base64url').toString();
      const [payload] = decoded.split('.');
      const preliminaryData = JSON.parse(payload);

      if (!preliminaryData.environmentId) {
        throw new BadRequestException('Invalid Slack state: missing environmentId');
      }

      const environment = await this.environmentRepository.findOne({
        _id: preliminaryData.environmentId,
        _organizationId: preliminaryData.organizationId,
      });

      if (!environment) {
        throw new NotFoundException(`Environment not found: ${preliminaryData.environmentId}`);
      }

      if (!environment.apiKeys?.length) {
        throw new NotFoundException(`Environment ${preliminaryData.environmentId} has no API keys`);
      }

      const environmentApiKey = environment.apiKeys[0].key;

      return await GenerateSlackOauthUrl.validateAndDecodeState(state, environmentApiKey);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Invalid or expired Slack OAuth state parameter');
    }
  }
}
