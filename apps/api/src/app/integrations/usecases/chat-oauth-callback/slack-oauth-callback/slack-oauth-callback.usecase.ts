import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  decryptCredentials,
  GetNovuProviderCredentials,
  GetNovuProviderCredentialsCommand,
} from '@novu/application-generic';
import {
  ChannelTypeEnum,
  EnvironmentRepository,
  ICredentialsEntity,
  IntegrationEntity,
  IntegrationRepository,
} from '@novu/dal';
import { ChatProviderIdEnum, ENDPOINT_TYPES } from '@novu/shared';
import axios from 'axios';
import { CreateChannelConnectionCommand } from '../../../../channel-connections/usecases/create-channel-connection/create-channel-connection.command';
import { CreateChannelConnection } from '../../../../channel-connections/usecases/create-channel-connection/create-channel-connection.usecase';
import { CreateChannelEndpointCommand } from '../../../../channel-endpoints/usecases/create-channel-endpoint/create-channel-endpoint.command';
import { CreateChannelEndpoint } from '../../../../channel-endpoints/usecases/create-channel-endpoint/create-channel-endpoint.usecase';
import { peekOAuthStatePayload } from '../../generate-chat-oath-url/chat-oauth-state.util';
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
    private getNovuProviderCredentials: GetNovuProviderCredentials,
    private createChannelConnection: CreateChannelConnection,
    private createChannelEndpoint: CreateChannelEndpoint
  ) {}

  async execute(command: SlackOauthCallbackCommand): Promise<ChatOauthCallbackResult> {
    const stateData = await this.decodeSlackState(command.state);
    const integration = await this.getIntegration(stateData);
    const credentials = await this.getIntegrationCredentials(integration);

    const authData = await this.exchangeCodeForAuthData(command.providerCode, credentials);

    if (stateData.mode === 'link_user') {
      await this.linkUserEndpoint(stateData, integration, authData);
    } else if (authData.incoming_webhook) {
      /*
       * Incoming webhooks are handled differently from workspace connections:
       *
       * - Incoming webhook: Creates a stateless endpoint tied to a specific subscriber
       *   using only the webhook URL. This provides direct message delivery.
       *
       * - Workspace connection: Uses access_token for broader workspace access
       *   and is not tied to a specific subscriber.
       *
       * While authData contains both access_token and channel_id, we intentionally
       * use only the webhook URL to maintain clear separation of concerns.
       */
      await this.createIncomingWebhookEndpoint(stateData, integration, authData);
    } else {
      const isSharedMode = stateData.connectionMode === 'shared';
      const connection = await this.createChannelConnection.execute(
        CreateChannelConnectionCommand.create({
          identifier: stateData.identifier,
          organizationId: stateData.organizationId,
          environmentId: stateData.environmentId,
          integrationIdentifier: integration.identifier,
          subscriberId: isSharedMode ? undefined : stateData.subscriberId,
          context: stateData.context,
          connectionMode: stateData.connectionMode,
          auth: {
            accessToken: authData.access_token,
          },
          workspace: {
            id: authData.team.id,
            name: authData.team.name,
          },
        })
      );
      if (stateData.autoLinkUser === true && stateData.subscriberId && authData.authed_user?.id) {
        await this.createChannelEndpoint.execute(
          CreateChannelEndpointCommand.create({
            organizationId: stateData.organizationId,
            environmentId: stateData.environmentId,
            integrationIdentifier: integration.identifier,
            connectionIdentifier: connection.identifier,
            subscriberId: stateData.subscriberId,
            context: stateData.context,
            type: ENDPOINT_TYPES.SLACK_USER,
            endpoint: { userId: authData.authed_user.id },
          })
        );
      }
    }

    if (credentials.redirectUrl) {
      return { type: ResponseTypeEnum.URL, result: credentials.redirectUrl };
    }

    return {
      type: ResponseTypeEnum.HTML,
      result: this.SCRIPT_CLOSE_TAB,
    };
  }

  private async linkUserEndpoint(stateData: StateData, integration: IntegrationEntity, authData: any): Promise<void> {
    if (!stateData.subscriberId) {
      throw new BadRequestException('subscriberId is required for link_user mode');
    }

    const userId = authData.authed_user?.id;

    if (!userId) {
      throw new BadRequestException('Slack did not return a user ID in the OAuth response');
    }

    await this.createChannelEndpoint.execute(
      CreateChannelEndpointCommand.create({
        organizationId: stateData.organizationId,
        environmentId: stateData.environmentId,
        integrationIdentifier: integration.identifier,
        connectionIdentifier: stateData.identifier,
        subscriberId: stateData.subscriberId,
        context: stateData.context,
        type: ENDPOINT_TYPES.SLACK_USER,
        endpoint: { userId },
      })
    );
  }

  private async createIncomingWebhookEndpoint(
    stateData: StateData,
    integration: IntegrationEntity,
    authData: any
  ): Promise<void> {
    if (!stateData.subscriberId) {
      throw new BadRequestException('subscriberId is required for incoming webhook');
    }

    await this.createChannelEndpoint.execute(
      CreateChannelEndpointCommand.create({
        organizationId: stateData.organizationId,
        environmentId: stateData.environmentId,
        context: stateData.context,
        integrationIdentifier: integration.identifier,
        subscriberId: stateData.subscriberId,
        type: ENDPOINT_TYPES.WEBHOOK,
        endpoint: {
          url: authData.incoming_webhook.url,
        },
      })
    );
  }

  private async getIntegration(stateData: StateData): Promise<IntegrationEntity> {
    const integration = await this.integrationRepository.findOne({
      _environmentId: stateData.environmentId,
      _organizationId: stateData.organizationId,
      channel: ChannelTypeEnum.CHAT,
      providerId: { $in: [ChatProviderIdEnum.Slack, ChatProviderIdEnum.Novu] },
      identifier: stateData.integrationIdentifier,
    });

    if (!integration) {
      throw new NotFoundException(
        `Slack integration not found: ${stateData.integrationIdentifier} in environment ${stateData.environmentId}`
      );
    }

    return integration;
  }

  private async getIntegrationCredentials(integration: IntegrationEntity): Promise<ICredentialsEntity> {
    if (integration.providerId === ChatProviderIdEnum.Novu) {
      return this.getDemoNovuSlackCredentials(integration);
    }

    if (!integration.credentials) {
      throw new NotFoundException(`Slack integration missing credentials `);
    }

    if (!integration.credentials.clientId || !integration.credentials.secretKey) {
      throw new NotFoundException(`Slack integration missing required OAuth credentials (clientId/clientSecret) `);
    }

    return integration.credentials;
  }

  private async getDemoNovuSlackCredentials(integration: IntegrationEntity): Promise<ICredentialsEntity> {
    return await this.getNovuProviderCredentials.execute(
      GetNovuProviderCredentialsCommand.create({
        channelType: integration.channel,
        providerId: integration.providerId,
        environmentId: integration._environmentId,
        organizationId: integration._organizationId,
        userId: 'system',
      })
    );
  }

  private async exchangeCodeForAuthData(providerCode: string, integrationCredentials: ICredentialsEntity) {
    const credentials = decryptCredentials(integrationCredentials);

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

    return res.data;
  }

  private async decodeSlackState(state: string): Promise<StateData> {
    try {
      const preliminaryData = peekOAuthStatePayload<Partial<StateData>>(state);

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
