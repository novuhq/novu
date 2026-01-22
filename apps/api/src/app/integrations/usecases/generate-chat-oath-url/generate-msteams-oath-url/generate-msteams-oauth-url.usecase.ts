import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from '@novu/application-generic';
import { EnvironmentRepository, ICredentialsEntity, IntegrationEntity, SubscriberRepository } from '@novu/dal';
import { ChatProviderIdEnum, ContextPayload } from '@novu/shared';
import { CHAT_OAUTH_CALLBACK_PATH } from '../chat-oauth.constants';
import { GenerateMsTeamsOauthUrlCommand } from './generate-msteams-oauth-url.command';

export type StateData = {
  identifier?: string;
  subscriberId?: string;
  context?: ContextPayload;
  environmentId: string;
  organizationId: string;
  integrationIdentifier: string;
  providerId: ChatProviderIdEnum;
  timestamp: number;
};

@Injectable()
export class GenerateMsTeamsOauthUrl {
  /*
   * MS Teams Admin Consent flow (app-only):
   * - Uses /adminconsent endpoint instead of /authorize
   * - No code exchange, no refresh token
   * - Admin grants application permissions once per tenant
   * - Messages sent as bot/app identity, not as user
   * - Requires application permissions configured in Azure app registration:
   *   Team.ReadBasic.All, Channel.ReadBasic.All, AppCatalog.Read.All,
   *   TeamsAppInstallation.ReadWriteSelfForTeam.All, TeamsAppInstallation.ReadWriteSelfForUser.All
   */
  private readonly MS_TEAMS_ADMIN_CONSENT_URL = 'https://login.microsoftonline.com/organizations/v2.0/adminconsent?';

  constructor(
    private environmentRepository: EnvironmentRepository,
    private subscriberRepository: SubscriberRepository
  ) {}

  async execute(command: GenerateMsTeamsOauthUrlCommand): Promise<string> {
    this.validateSubscriberIdOrContext(command);
    await this.assertResourceExists(command);

    const { clientId } = await this.getIntegrationCredentials(command.integration);

    if (!clientId) {
      throw new NotFoundException('MS Teams integration missing clientId');
    }

    const secureState = await this.createSecureState(
      command.integration,
      command.subscriberId,
      command.context,
      command.connectionIdentifier
    );

    return this.getOAuthUrl(clientId, secureState);
  }

  private validateSubscriberIdOrContext(command: GenerateMsTeamsOauthUrlCommand): void {
    const { subscriberId, context } = command;

    if (!subscriberId && !context) {
      throw new BadRequestException('Either subscriberId or context must be provided');
    }
  }

  private async assertResourceExists(command: GenerateMsTeamsOauthUrlCommand) {
    const { subscriberId, organizationId, environmentId } = command;

    if (!subscriberId) {
      return;
    }

    const found = await this.subscriberRepository.findOne({
      subscriberId,
      _organizationId: organizationId,
      _environmentId: environmentId,
    });

    if (!found) throw new NotFoundException(`Subscriber not found: ${subscriberId}`);

    return;
  }

  private async getOAuthUrl(clientId: string, secureState: string): Promise<string> {
    const oauthParams = new URLSearchParams({
      client_id: clientId,
      redirect_uri: GenerateMsTeamsOauthUrl.buildRedirectUri(),
      scope: 'https://graph.microsoft.com/.default',
      state: secureState,
    });

    return `${this.MS_TEAMS_ADMIN_CONSENT_URL}${oauthParams.toString()}`;
  }

  private async createSecureState(
    integration: IntegrationEntity,
    subscriberId?: string,
    context?: ContextPayload,
    connectionIdentifier?: string
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
    };

    const payload = JSON.stringify(stateData);
    const secret = await this.getEnvironmentApiKey(_environmentId);
    const signature = createHash(secret, payload);

    if (!signature) {
      throw new BadRequestException('Failed to create OAuth state signature');
    }

    return Buffer.from(`${payload}.${signature}`).toString('base64url');
  }

  static async validateAndDecodeState(state: string, environmentApiKey: string): Promise<StateData> {
    try {
      const decoded = Buffer.from(state, 'base64url').toString();
      const [payload, signature] = decoded.split('.');

      const expectedSignature = createHash(environmentApiKey, payload);
      if (signature !== expectedSignature) {
        throw new Error('Invalid state signature');
      }

      const data = JSON.parse(payload);

      // Validate timestamp (5 minutes expiry)
      const FIVE_MINUTES = 5 * 60 * 1000;
      if (Date.now() - data.timestamp > FIVE_MINUTES) {
        throw new Error('OAuth state expired');
      }

      return data;
    } catch {
      throw new BadRequestException('Invalid OAuth state parameter');
    }
  }

  static buildRedirectUri(): string {
    if (!process.env.API_ROOT_URL) {
      throw new Error('API_ROOT_URL environment variable is required');
    }

    const baseUrl = process.env.API_ROOT_URL.replace(/\/$/, ''); // Remove trailing slash
    return `${baseUrl}${CHAT_OAUTH_CALLBACK_PATH}`;
  }

  private async getIntegrationCredentials(integration: IntegrationEntity): Promise<ICredentialsEntity> {
    if (!integration.credentials) {
      throw new NotFoundException(`MS Teams integration missing credentials `);
    }

    if (!integration.credentials.clientId) {
      throw new NotFoundException(`MS Teams integration missing required OAuth credentials (clientId) `);
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
