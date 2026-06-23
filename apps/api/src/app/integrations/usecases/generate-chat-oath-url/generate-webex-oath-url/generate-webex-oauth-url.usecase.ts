import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrUpdateSubscriberUseCase, createHash } from '@novu/application-generic';
import { EnvironmentRepository, ICredentialsEntity, IntegrationEntity, SubscriberRepository } from '@novu/dal';
import { ChatProviderIdEnum, ConnectionMode, ContextPayload } from '@novu/shared';
import { validateConnectionMode } from '../../../../channel-connections/usecases/channel-connection.utils';
import { ensureConnectDashboardSubscriber } from '../../../../channel-connections/usecases/ensure-connect-dashboard-subscriber';
import { areHexDigestsEqual } from '../../../../shared/helpers/timing-safe-equal';
import { CHAT_OAUTH_CALLBACK_PATH } from '../chat-oauth.constants';
import { encodeOAuthState, splitOAuthState } from '../chat-oauth-state.util';
import { GenerateWebexOauthUrlCommand } from './generate-webex-oauth-url.command';

export type OAuthMode = 'connect' | 'link_user';

export interface StateData {
  identifier?: string;
  subscriberId?: string;
  context?: ContextPayload;
  environmentId: string;
  organizationId: string;
  integrationIdentifier: string;
  providerId: ChatProviderIdEnum;
  timestamp: number;
  mode?: OAuthMode;
  connectionMode?: ConnectionMode;
  autoLinkUser?: boolean;
}

export const WEBEX_DEFAULT_OAUTH_SCOPES = [
  'spark:messages_write',
  'spark:rooms_read',
  'spark:people_read',
  'spark:memberships_read',
] as const;

export const WEBEX_LINK_USER_OAUTH_SCOPES = ['spark:people_read'] as const;

@Injectable()
export class GenerateWebexOauthUrl {
  private readonly WEBEX_OAUTH_URL = 'https://webexapis.com/v1/authorize?';

  constructor(
    private environmentRepository: EnvironmentRepository,
    private subscriberRepository: SubscriberRepository,
    private createOrUpdateSubscriber: CreateOrUpdateSubscriberUseCase
  ) {}

  async execute(command: GenerateWebexOauthUrlCommand): Promise<string> {
    this.validateSubscriberIdOrContext(command);
    await this.assertResourceExists(command);

    const { clientId } = await this.getIntegrationCredentials(command.integration);

    if (!clientId) {
      throw new NotFoundException('Webex Messaging integration missing required OAuth credentials (clientId)');
    }

    const secureState = await this.createSecureState(
      command.integration,
      command.subscriberId,
      command.context,
      command.connectionIdentifier,
      command.mode,
      command.connectionMode,
      command.autoLinkUser
    );

    return this.getOAuthUrl(clientId, secureState, this.resolveScopes(command));
  }

  private validateSubscriberIdOrContext(command: GenerateWebexOauthUrlCommand): void {
    if (command.mode === 'link_user') {
      if (!command.subscriberId) {
        throw new BadRequestException('subscriberId is required for link_user mode');
      }

      if (!command.connectionIdentifier) {
        throw new BadRequestException('connectionIdentifier is required for Webex link_user mode');
      }

      return;
    }

    validateConnectionMode({
      connectionMode: command.connectionMode,
      subscriberId: command.subscriberId,
      context: command.context,
    });
  }

  private async assertResourceExists(command: GenerateWebexOauthUrlCommand) {
    const { subscriberId, organizationId, environmentId } = command;

    if (!subscriberId) {
      return;
    }

    await ensureConnectDashboardSubscriber({
      subscriberId,
      environmentId,
      organizationId,
      subscriberRepository: this.subscriberRepository,
      createOrUpdateSubscriber: this.createOrUpdateSubscriber,
    });
  }

  private resolveScopes(command: GenerateWebexOauthUrlCommand): string[] {
    if (command.mode === 'link_user') {
      return command.userScope ?? [...WEBEX_LINK_USER_OAUTH_SCOPES];
    }

    return command.scope ?? [...WEBEX_DEFAULT_OAUTH_SCOPES];
  }

  private getOAuthUrl(clientId: string, secureState: string, scope: string[]): string {
    const oauthParams = new URLSearchParams({
      state: secureState,
      client_id: clientId,
      response_type: 'code',
      redirect_uri: GenerateWebexOauthUrl.buildRedirectUri(),
      scope: scope.join(' '),
    });

    return `${this.WEBEX_OAUTH_URL}${oauthParams.toString()}`;
  }

  private async createSecureState(
    integration: IntegrationEntity,
    subscriberId?: string,
    context?: ContextPayload,
    connectionIdentifier?: string,
    mode?: OAuthMode,
    connectionMode?: ConnectionMode,
    autoLinkUser?: boolean
  ): Promise<string> {
    const { _environmentId, _organizationId, identifier, providerId } = integration;

    const stateData: StateData = {
      identifier: connectionIdentifier,
      subscriberId,
      context,
      environmentId: _environmentId,
      organizationId: _organizationId,
      integrationIdentifier: identifier,
      providerId: providerId as ChatProviderIdEnum,
      timestamp: Date.now(),
      mode,
      connectionMode,
      autoLinkUser,
    };

    const payload = JSON.stringify(stateData);
    const secret = await this.getEnvironmentApiKey(_environmentId);
    const signature = createHash(secret, payload);

    if (!signature) {
      throw new BadRequestException('Failed to create OAuth state signature');
    }

    return encodeOAuthState(payload, signature);
  }

  static async validateAndDecodeState(state: string, environmentApiKey: string): Promise<StateData> {
    try {
      const { payload, signature } = splitOAuthState(state);

      const expectedSignature = createHash(environmentApiKey, payload);
      if (!areHexDigestsEqual(expectedSignature, signature)) {
        throw new Error('Invalid state signature');
      }

      const data = JSON.parse(payload);

      const FIVE_MINUTES = 5 * 60 * 1000;
      const now = Date.now();
      if (typeof data.timestamp !== 'number' || !Number.isFinite(data.timestamp) || data.timestamp > now) {
        throw new Error('Invalid OAuth state timestamp');
      }

      if (now - data.timestamp > FIVE_MINUTES) {
        throw new Error('OAuth state expired');
      }

      return data;
    } catch {
      throw new BadRequestException('Invalid OAuth state parameter');
    }
  }

  static buildRedirectUri(): string {
    const rootUrl = process.env.AGENT_API_HOSTNAME ?? process.env.API_ROOT_URL;
    if (!rootUrl) {
      throw new Error('AGENT_API_HOSTNAME or API_ROOT_URL environment variable is required');
    }

    const baseUrl = rootUrl.replace(/\/$/, '');

    return `${baseUrl}${CHAT_OAUTH_CALLBACK_PATH}`;
  }

  private async getIntegrationCredentials(integration: IntegrationEntity): Promise<ICredentialsEntity> {
    if (!integration.credentials) {
      throw new NotFoundException('Webex Messaging integration missing credentials');
    }

    if (!integration.credentials.clientId) {
      throw new NotFoundException('Webex Messaging integration missing required OAuth credentials (clientId)');
    }

    return integration.credentials;
  }

  private async getEnvironmentApiKey(environmentId: string): Promise<string> {
    const apiKeys = await this.environmentRepository.getApiKeys(environmentId);

    if (!apiKeys.length) {
      throw new NotFoundException(`Environment ID: ${environmentId} not found`);
    }

    return apiKeys[0].key;
  }
}
