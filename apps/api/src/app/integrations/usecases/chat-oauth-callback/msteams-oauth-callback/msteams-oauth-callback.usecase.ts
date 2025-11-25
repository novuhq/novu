import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import {
  ChannelTypeEnum,
  EnvironmentRepository,
  ICredentialsEntity,
  IntegrationEntity,
  IntegrationRepository,
} from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';
import { CreateChannelConnectionCommand } from '../../../../channel-connections/usecases/create-channel-connection/create-channel-connection.command';
import { CreateChannelConnection } from '../../../../channel-connections/usecases/create-channel-connection/create-channel-connection.usecase';
import {
  GenerateMsTeamsOauthUrl,
  StateData,
} from '../../generate-chat-oath-url/generate-msteams-oath-url/generate-msteams-oauth-url.usecase';
import { ChatOauthCallbackResult, ResponseTypeEnum } from '../chat-oauth-callback.response';
import { MsTeamsOauthCallbackCommand } from './msteams-oauth-callback.command';

@Injectable()
export class MsTeamsOauthCallback {
  private readonly SCRIPT_CLOSE_TAB = '<script>window.close();</script>';

  constructor(
    private integrationRepository: IntegrationRepository,
    private environmentRepository: EnvironmentRepository,
    private createChannelConnection: CreateChannelConnection,
    private logger: PinoLogger
  ) {
    this.logger.setContext(MsTeamsOauthCallback.name);
  }

  async execute(command: MsTeamsOauthCallbackCommand): Promise<ChatOauthCallbackResult> {
    const stateData = await this.decodeMsTeamsState(command.state);
    const integration = await this.getIntegration(stateData);
    const credentials = await this.getIntegrationCredentials(integration);

    if (!command.tenant) {
      throw new BadRequestException('Missing tenant parameter from MS Teams admin consent');
    }

    if (command.adminConsent !== 'True') {
      throw new BadRequestException('Admin consent was not granted');
    }

    /*
     * MS Teams app-only connection strategy:
     * - Admin grants consent once per subscriber tenant
     * - No code exchange, no tokens stored
     * - Store only the tenant ID
     * - When sending: use client_credentials to get fresh app-only tokens
     * - Messages sent as bot/app identity, not as user
     */
    const authData = {
      accessToken: 'app-only',
    };

    const workspaceData = {
      id: command.tenant,
    };

    await this.createChannelConnection.execute(
      CreateChannelConnectionCommand.create({
        identifier: stateData.identifier,
        organizationId: stateData.organizationId,
        environmentId: stateData.environmentId,
        integrationIdentifier: integration.identifier,
        subscriberId: stateData.subscriberId,
        context: stateData.context,
        auth: authData,
        workspace: workspaceData,
      })
    );

    if (credentials.redirectUrl) {
      return { type: ResponseTypeEnum.URL, result: credentials.redirectUrl };
    }

    return {
      type: ResponseTypeEnum.HTML,
      result: this.SCRIPT_CLOSE_TAB,
    };
  }

  private async getIntegration(stateData: StateData): Promise<IntegrationEntity> {
    const integration = await this.integrationRepository.findOne({
      _environmentId: stateData.environmentId,
      _organizationId: stateData.organizationId,
      channel: ChannelTypeEnum.CHAT,
      providerId: ChatProviderIdEnum.MsTeams,
      identifier: stateData.integrationIdentifier,
    });

    if (!integration) {
      throw new NotFoundException(
        `MS Teams integration not found: ${stateData.integrationIdentifier} in environment ${stateData.environmentId}`
      );
    }

    return integration;
  }

  private async getIntegrationCredentials(integration: IntegrationEntity): Promise<ICredentialsEntity> {
    if (!integration.credentials) {
      throw new NotFoundException('MS Teams integration missing credentials');
    }

    const { clientId, secretKey, tenantId } = integration.credentials;

    if (!clientId || !secretKey || !tenantId) {
      throw new NotFoundException('MS Teams integration missing required credentials (clientId, secretKey, tenantId)');
    }

    return integration.credentials;
  }

  private async decodeMsTeamsState(state: string): Promise<StateData> {
    try {
      const decoded = Buffer.from(state, 'base64url').toString();
      const [payload] = decoded.split('.');
      const preliminaryData = JSON.parse(payload);

      if (!preliminaryData.environmentId) {
        throw new BadRequestException('Invalid MS Teams state: missing environmentId');
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

      return await GenerateMsTeamsOauthUrl.validateAndDecodeState(state, environmentApiKey);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Invalid or expired MS Teams OAuth state parameter');
    }
  }
}
