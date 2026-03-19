import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, GetNovuProviderCredentials, GetNovuProviderCredentialsCommand } from '@novu/application-generic';
import { EnvironmentRepository, ICredentialsEntity, IntegrationEntity, SubscriberRepository } from '@novu/dal';
import { ChatProviderIdEnum, ContextPayload } from '@novu/shared';
import { CHAT_OAUTH_CALLBACK_PATH } from '../chat-oauth.constants';
import { GenerateSlackOauthUrlCommand } from './generate-slack-oauth-url.command';

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

export const SLACK_DEFAULT_OAUTH_SCOPES = [
  'chat:write',
  'chat:write.public',
  'channels:read',
  'groups:read',
  'users:read',
  'users:read.email',
] as const;

@Injectable()
export class GenerateSlackOauthUrl {
  private readonly SLACK_OAUTH_URL = 'https://slack.com/oauth/v2/authorize?';

  constructor(
    private environmentRepository: EnvironmentRepository,
    private getNovuProviderCredentials: GetNovuProviderCredentials,
    private subscriberRepository: SubscriberRepository
  ) {}

  async execute(command: GenerateSlackOauthUrlCommand): Promise<string> {
    this.validateSubscriberIdOrContext(command);
    await this.assertResourceExists(command);

    const { clientId } = await this.getIntegrationCredentials(command.integration);
    const secureState = await this.createSecureState(
      command.integration,
      command.subscriberId,
      command.context,
      command.connectionIdentifier
    );

    return this.getOAuthUrl(clientId!, secureState, command.scope);
  }

  private validateSubscriberIdOrContext(command: GenerateSlackOauthUrlCommand): void {
    const { subscriberId, context, scope } = command;

    if (scope?.includes('incoming-webhook')) {
      if (!subscriberId) {
        throw new BadRequestException('subscriberId is required for incoming webhook');
      }
    }

    if (!subscriberId && !context) {
      throw new BadRequestException('Either subscriberId or context must be provided');
    }
  }

  private async assertResourceExists(command: GenerateSlackOauthUrlCommand) {
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

  private async getOAuthUrl(clientId: string, secureState: string, scope?: string[]): Promise<string> {
    const oauthParams = new URLSearchParams({
      state: secureState,
      client_id: clientId,
      scope: scope?.join(',') ?? SLACK_DEFAULT_OAUTH_SCOPES.join(','),
      redirect_uri: GenerateSlackOauthUrl.buildRedirectUri(),
    });

    return `${this.SLACK_OAUTH_URL}${oauthParams.toString()}`;
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
    } catch (error) {
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
    if (integration.providerId === ChatProviderIdEnum.Novu) {
      return this.getDemoNovuSlackCredentials(integration);
    }

    if (!integration.credentials) {
      throw new NotFoundException(`Slack integration missing credentials `);
    }

    if (!integration.credentials.clientId) {
      throw new NotFoundException(`Slack integration missing required OAuth credentials (clientId) `);
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

  private async getEnvironmentApiKey(environmentId: string): Promise<string> {
    const apiKeys = await this.environmentRepository.getApiKeys(environmentId);

    if (!apiKeys.length) {
      throw new NotFoundException(`Environment ID: ${environmentId} not found`);
    }

    return apiKeys[0].key;
  }
}
