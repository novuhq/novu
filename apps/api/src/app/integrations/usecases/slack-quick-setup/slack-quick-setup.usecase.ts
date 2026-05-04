import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHash, encryptCredentials, PinoLogger } from '@novu/application-generic';
import { EnvironmentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum, SLACK_AGENT_OAUTH_SCOPES } from '@novu/shared';
import axios, { AxiosError } from 'axios';
import { CHAT_OAUTH_CALLBACK_PATH } from '../generate-chat-oath-url/chat-oauth.constants';
import { encodeOAuthState } from '../generate-chat-oath-url/chat-oauth-state.util';
import type { StateData } from '../generate-chat-oath-url/generate-slack-oath-url/generate-slack-oauth-url.usecase';
import { SlackQuickSetupCommand } from './slack-quick-setup.command';

type SlackManifestError = {
  message: string;
  pointer: string;
};

type SlackManifestCreateResponse = {
  ok: boolean;
  error?: string;
  errors?: SlackManifestError[];
  app_id?: string;
  credentials?: {
    client_id: string;
    client_secret: string;
    verification_token: string;
    signing_secret: string;
  };
  oauth_authorize_url?: string;
};

export type SlackQuickSetupResult = {
  /** Slack OAuth authorize URL to redirect the user to install the app */
  oauthAuthorizeUrl: string;
};

@Injectable()
export class SlackQuickSetup {
  private readonly SLACK_MANIFEST_CREATE_URL = 'https://slack.com/api/apps.manifest.create';
  private readonly SLACK_OAUTH_URL = 'https://slack.com/oauth/v2/authorize?';

  constructor(
    private integrationRepository: IntegrationRepository,
    private environmentRepository: EnvironmentRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(SlackQuickSetup.name);
  }

  async execute(command: SlackQuickSetupCommand): Promise<SlackQuickSetupResult> {
    const integration = await this.integrationRepository.findOne({
      _id: command.integrationId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    if (!integration) {
      throw new NotFoundException(`Integration ${command.integrationId} not found`);
    }

    if (integration.providerId !== ChatProviderIdEnum.Slack) {
      throw new UnauthorizedException('Slack quick setup is only supported for Slack integrations');
    }

    const manifest = this.buildManifest(integration.name ?? 'Novu Bot', integration.identifier, command.agentId);

    this.logger.info(`Slack quick setup: creating app for integrationId=${command.integrationId}`);

    const slackResponse = await this.callManifestCreate(command.configToken, manifest);

    if (!slackResponse.ok || !slackResponse.credentials || !slackResponse.app_id) {
      const errorDetails =
        slackResponse.errors && slackResponse.errors.length > 0
          ? ` Details: ${slackResponse.errors.map((e) => `${e.pointer}: ${e.message}`).join('; ')}`
          : '';
      const baseError = slackResponse.error ?? 'unknown error';
      const hint =
        baseError === 'invalid_token' || baseError === 'token_expired'
          ? ' Make sure your App Configuration Token is valid and has not expired.'
          : baseError === 'invalid_manifest'
            ? ' The manifest schema was rejected by Slack.'
            : '';

      throw new BadRequestException(`Slack app creation failed: ${baseError}.${hint}${errorDetails}`);
    }

    const { client_id, client_secret, signing_secret } = slackResponse.credentials;
    const pendingSetupId = randomUUID();

    await this.storePendingCredentials(
      command,
      pendingSetupId,
      client_id,
      client_secret,
      signing_secret,
      slackResponse.app_id
    );

    this.logger.info(`Slack quick setup: pending credentials staged for integrationId=${command.integrationId}`);

    const oauthAuthorizeUrl = await this.buildOAuthUrl(
      client_id,
      integration,
      pendingSetupId,
      command.subscriberId,
      command.connectionIdentifier
    );

    return { oauthAuthorizeUrl };
  }

  /**
   * Slack rejects display_name values that are or contain the reserved word "slack"
   * (case-insensitive). Strip it and fall back to a safe default when nothing is left.
   */
  private sanitizeBotDisplayName(name: string): string {
    const sanitized = name.replace(/slack/gi, '').trim();

    return sanitized.length > 0 ? sanitized : 'Novu Bot';
  }

  private buildManifest(botName: string, integrationIdentifier: string, agentId: string): object {
    const apiBaseUrl = (process.env.API_ROOT_URL ?? 'https://api.novu.co').replace(/\/$/, '');
    const oauthCallbackUrl = `${apiBaseUrl}${CHAT_OAUTH_CALLBACK_PATH}`;
    const displayName = this.sanitizeBotDisplayName(botName);

    const webhookUrl = `${apiBaseUrl}/v1/agents/${agentId}/webhook/${integrationIdentifier}`;

    return {
      display_information: {
        name: displayName,
        description: 'Agent built with Novu',
      },
      features: {
        app_home: {
          home_tab_enabled: false,
          messages_tab_enabled: true,
          messages_tab_read_only_enabled: false,
        },
        /*
         * assistant_view is required by Slack's manifest schema when subscribing to
         * assistant_thread_started or assistant_thread_context_changed bot events.
         * Without it the manifest is rejected with invalid_manifest.
         */
        assistant_view: {
          assistant_description: 'Agent built with Novu',
        },
        bot_user: {
          display_name: displayName,
          always_online: true,
        },
      },
      oauth_config: {
        redirect_urls: [oauthCallbackUrl],
        scopes: {
          bot: [...SLACK_AGENT_OAUTH_SCOPES],
        },
      },
      settings: {
        event_subscriptions: {
          request_url: webhookUrl,
          bot_events: [
            'app_mention',
            'message.channels',
            'message.groups',
            'message.im',
            'message.mpim',
            'member_joined_channel',
            'assistant_thread_started',
            'assistant_thread_context_changed',
          ],
        },
        interactivity: {
          is_enabled: true,
          request_url: webhookUrl,
        },
        org_deploy_enabled: false,
        socket_mode_enabled: false,
        token_rotation_enabled: false,
      },
    };
  }

  private async callManifestCreate(configToken: string, manifest: object): Promise<SlackManifestCreateResponse> {
    try {
      const params = new URLSearchParams({
        token: configToken,
        manifest: JSON.stringify(manifest),
      });

      const response = await axios.post<SlackManifestCreateResponse>(
        this.SLACK_MANIFEST_CREATE_URL,
        params.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 5000,
        }
      );

      return response.data;
    } catch (error) {
      const message = error instanceof AxiosError ? (error.response?.data?.error ?? error.message) : String(error);
      throw new BadRequestException(`Failed to create Slack app: ${message}`);
    }
  }

  private async buildOAuthUrl(
    clientId: string,
    integration: { _environmentId: string; _organizationId: string; identifier: string },
    pendingSetupId: string,
    subscriberId?: string,
    connectionIdentifier?: string
  ): Promise<string> {
    const apiBaseUrl = (process.env.API_ROOT_URL ?? 'https://api.novu.co').replace(/\/$/, '');
    const redirectUri = `${apiBaseUrl}${CHAT_OAUTH_CALLBACK_PATH}`;

    const stateData: StateData = {
      environmentId: integration._environmentId,
      organizationId: integration._organizationId,
      integrationIdentifier: integration.identifier,
      providerId: ChatProviderIdEnum.Slack,
      timestamp: Date.now(),
      mode: 'connect',
      pendingSetupId,
      ...(subscriberId && { subscriberId, connectionMode: 'subscriber' }),
      ...(connectionIdentifier && { identifier: connectionIdentifier }),
    };

    const payload = JSON.stringify(stateData);
    const secret = await this.getEnvironmentApiKey(integration._environmentId);
    const signature = createHash(secret, payload);

    if (!signature) {
      throw new BadRequestException('Failed to create OAuth state signature');
    }

    const secureState = encodeOAuthState(payload, signature);

    const oauthParams = new URLSearchParams({
      state: secureState,
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: SLACK_AGENT_OAUTH_SCOPES.join(','),
    });

    return `${this.SLACK_OAUTH_URL}${oauthParams.toString()}`;
  }

  private async getEnvironmentApiKey(environmentId: string): Promise<string> {
    const apiKeys = await this.environmentRepository.getApiKeys(environmentId);

    if (!apiKeys.length) {
      throw new NotFoundException(`Environment ID: ${environmentId} not found`);
    }

    return apiKeys[0].key;
  }

  private async storePendingCredentials(
    command: SlackQuickSetupCommand,
    pendingSetupId: string,
    clientId: string,
    clientSecret: string,
    signingSecret: string,
    applicationId?: string
  ): Promise<void> {
    /*
     * Two-phase commit: we stage the newly-created Slack app credentials in
     * provisioning.pendingCredentials rather than writing straight to
     * integration.credentials. This preserves two invariants:
     *
     * 1. `integration.credentials` always represents the live, working credentials.
     *    Writing here before the OAuth install completes would mark the integration
     *    as "configured" even if the user abandons the Slack install screen.
     *
     * 2. Re-installs are safe. If this method runs against an integration that already
     *    has working credentials (e.g. the user is rotating the app), the live creds
     *    are not touched until the callback confirms a successful install.
     *
     * The OAuth callback handler verifies provisioning.pendingSetupId matches the value
     * embedded in the signed state parameter, then atomically promotes pendingCredentials
     * → credentials and clears both pending fields.
     */
    const pendingCredentials = encryptCredentials({
      clientId,
      secretKey: clientSecret,
      signingSecret,
      ...(applicationId && { applicationId }),
    });

    await this.integrationRepository.update(
      { _id: command.integrationId, _environmentId: command.environmentId, _organizationId: command.organizationId },
      {
        $set: {
          'provisioning.pendingSetupId': pendingSetupId,
          'provisioning.pendingCredentials': pendingCredentials,
        },
      }
    );
  }
}
