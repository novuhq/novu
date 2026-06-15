import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { decryptCredentials } from '@novu/application-generic';
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
import { renderConnectionResultPage } from '../../../../shared/html/connection-result-page';
import { peekOAuthStatePayload } from '../../generate-chat-oath-url/chat-oauth-state.util';
import {
  GenerateWebexOauthUrl,
  StateData,
} from '../../generate-chat-oath-url/generate-webex-oath-url/generate-webex-oauth-url.usecase';
import { ChatOauthCallbackResult, ResponseTypeEnum } from '../chat-oauth-callback.response';
import { WebexOauthCallbackCommand } from './webex-oauth-callback.command';

type WebexTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
};

type WebexPersonResponse = {
  id?: string;
  orgId?: string;
  displayName?: string;
  emails?: string[];
};

@Injectable()
export class WebexOauthCallback {
  private readonly WEBEX_ACCESS_TOKEN_URL = 'https://webexapis.com/v1/access_token';
  private readonly WEBEX_DEFAULT_BASE_URL = 'https://webexapis.com/v1';

  constructor(
    private integrationRepository: IntegrationRepository,
    private environmentRepository: EnvironmentRepository,
    private createChannelConnection: CreateChannelConnection,
    private createChannelEndpoint: CreateChannelEndpoint
  ) {}

  async execute(command: WebexOauthCallbackCommand): Promise<ChatOauthCallbackResult> {
    const stateData = await this.decodeWebexState(command.state);
    const integration = await this.getIntegration(stateData);
    const credentials = await this.getIntegrationCredentials(integration);
    const tokenData = await this.exchangeCodeForAuthData(command.providerCode, credentials);
    const person = await this.getCurrentPerson(tokenData.access_token, credentials);

    if (stateData.mode === 'link_user') {
      await this.linkUserEndpoint(stateData, integration, person);
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
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: this.buildExpiresAt(tokenData.expires_in),
            refreshTokenExpiresAt: this.buildExpiresAt(tokenData.refresh_token_expires_in),
          },
          workspace: this.buildWorkspace(person),
        })
      );

      if (stateData.autoLinkUser === true && stateData.subscriberId) {
        await this.createWebexPersonEndpoint(
          stateData,
          integration,
          connection.identifier,
          stateData.subscriberId,
          person
        );
      }
    }

    if (credentials.redirectUrl) {
      return { type: ResponseTypeEnum.URL, result: credentials.redirectUrl };
    }

    return {
      type: ResponseTypeEnum.HTML,
      result: renderConnectionResultPage({
        status: 'success',
        title: 'Connection complete',
        heading: "You're all set",
        message: 'Your Webex workspace is connected and ready to use.',
      }),
    };
  }

  private async linkUserEndpoint(
    stateData: StateData,
    integration: IntegrationEntity,
    person: WebexPersonResponse
  ): Promise<void> {
    if (!stateData.subscriberId) {
      throw new BadRequestException('subscriberId is required for link_user mode');
    }

    if (!stateData.identifier) {
      throw new BadRequestException('connectionIdentifier is required for Webex link_user mode');
    }

    await this.createWebexPersonEndpoint(stateData, integration, stateData.identifier, stateData.subscriberId, person);
  }

  private async createWebexPersonEndpoint(
    stateData: StateData,
    integration: IntegrationEntity,
    connectionIdentifier: string,
    subscriberId: string,
    person: WebexPersonResponse
  ): Promise<void> {
    const endpoint = this.buildPersonEndpoint(person);

    await this.createChannelEndpoint.execute(
      CreateChannelEndpointCommand.create({
        organizationId: stateData.organizationId,
        environmentId: stateData.environmentId,
        integrationIdentifier: integration.identifier,
        connectionIdentifier,
        subscriberId,
        context: stateData.context,
        type: ENDPOINT_TYPES.WEBEX_PERSON,
        endpoint,
      })
    );
  }

  private buildPersonEndpoint(person: WebexPersonResponse): { personId: string } | { personEmail: string } {
    if (person.id) {
      return { personId: person.id };
    }

    const [email] = person.emails ?? [];
    if (email) {
      return { personEmail: email };
    }

    throw new BadRequestException('Webex did not return a person ID or email in the OAuth response');
  }

  private async getIntegration(stateData: StateData): Promise<IntegrationEntity> {
    const integration = await this.integrationRepository.findOne({
      _environmentId: stateData.environmentId,
      _organizationId: stateData.organizationId,
      channel: ChannelTypeEnum.CHAT,
      providerId: ChatProviderIdEnum.WebexMessaging,
      identifier: stateData.integrationIdentifier,
    });

    if (!integration) {
      throw new NotFoundException(
        `Webex Messaging integration not found: ${stateData.integrationIdentifier} in environment ${stateData.environmentId}`
      );
    }

    return integration;
  }

  private async getIntegrationCredentials(integration: IntegrationEntity): Promise<ICredentialsEntity> {
    if (!integration.credentials) {
      throw new NotFoundException('Webex Messaging integration missing credentials');
    }

    if (!integration.credentials.clientId || !integration.credentials.secretKey) {
      throw new NotFoundException(
        'Webex Messaging integration missing required OAuth credentials (clientId/clientSecret)'
      );
    }

    return integration.credentials;
  }

  private async exchangeCodeForAuthData(
    providerCode: string,
    integrationCredentials: ICredentialsEntity
  ): Promise<WebexTokenResponse> {
    const credentials = decryptCredentials(integrationCredentials);
    const { clientId, secretKey } = credentials;

    if (!clientId || !secretKey) {
      throw new NotFoundException(
        'Webex Messaging integration missing required OAuth credentials (clientId/clientSecret)'
      );
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: providerCode,
      client_id: clientId,
      client_secret: secretKey,
      redirect_uri: GenerateWebexOauthUrl.buildRedirectUri(),
    });

    const response = await axios.post<WebexTokenResponse>(this.WEBEX_ACCESS_TOKEN_URL, body.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.data.access_token) {
      throw new BadRequestException('Webex OAuth response did not include an access token');
    }

    return response.data;
  }

  private async getCurrentPerson(
    accessToken: string,
    integrationCredentials: ICredentialsEntity
  ): Promise<WebexPersonResponse> {
    const credentials = decryptCredentials(integrationCredentials);
    const baseUrl = (credentials.baseUrl || this.WEBEX_DEFAULT_BASE_URL).replace(/\/+$/, '');
    const response = await axios.get<WebexPersonResponse>(`${baseUrl}/people/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  }

  private buildWorkspace(person: WebexPersonResponse): { id: string; name?: string } {
    const id = person.orgId ?? person.id;

    if (!id) {
      throw new BadRequestException('Webex did not return an org ID or person ID in the OAuth response');
    }

    return {
      id,
      name: person.orgId ? person.displayName : (person.emails?.[0] ?? person.displayName),
    };
  }

  private buildExpiresAt(expiresInSeconds?: number): string | undefined {
    if (!expiresInSeconds) {
      return undefined;
    }

    return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
  }

  private async decodeWebexState(state: string): Promise<StateData> {
    try {
      const preliminaryData = peekOAuthStatePayload<Partial<StateData>>(state);

      if (!preliminaryData.environmentId) {
        throw new BadRequestException('Invalid Webex state: missing environmentId');
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

      return await GenerateWebexOauthUrl.validateAndDecodeState(state, environmentApiKey);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Invalid or expired Webex OAuth state parameter');
    }
  }
}
