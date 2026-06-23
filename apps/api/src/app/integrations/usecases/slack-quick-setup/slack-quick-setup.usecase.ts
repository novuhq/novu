import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { encryptCredentials, PinoLogger } from '@novu/application-generic';
import { AgentIntegrationRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum, SLACK_AGENT_OAUTH_SCOPES } from '@novu/shared';
import axios, { AxiosError } from 'axios';
import { CHAT_OAUTH_CALLBACK_PATH } from '../generate-chat-oath-url/chat-oauth.constants';
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

export type SlackQuickSetupResult = Record<string, never>;

@Injectable()
export class SlackQuickSetup {
  private readonly SLACK_MANIFEST_CREATE_URL = 'https://slack.com/api/apps.manifest.create';

  constructor(
    private integrationRepository: IntegrationRepository,
    private agentIntegrationRepository: AgentIntegrationRepository,
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
      throw new BadRequestException('Slack quick setup is only supported for Slack integrations');
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

    await this.ensureAgentIntegrationLink(command);
    await this.saveCredentials(command, client_id, client_secret, signing_secret, slackResponse.app_id);

    this.logger.info(`Slack quick setup: credentials saved for integrationId=${command.integrationId}`);

    return {};
  }

  private async ensureAgentIntegrationLink(command: SlackQuickSetupCommand): Promise<void> {
    const existing = await this.agentIntegrationRepository.findOne(
      {
        _agentId: command.agentId,
        _integrationId: command.integrationId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );

    if (existing) {
      return;
    }

    const linkedElsewhere = await this.agentIntegrationRepository.findOne(
      {
        _integrationId: command.integrationId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_agentId']
    );

    if (linkedElsewhere) {
      throw new ConflictException('Integration is already linked to a different agent');
    }

    // Revives a tombstoned (disconnected) link when one exists for this pair —
    // a plain create would violate the unique (_agentId, _integrationId) index.
    await this.agentIntegrationRepository.createOrReviveLink({
      agentId: command.agentId,
      integrationId: command.integrationId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });
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
    // Slack must reach both the OAuth callback and the agent webhook over the
    // public internet — so `api.novu.localhost` and any LAN-only hostname are
    // unreachable. `AGENT_API_HOSTNAME` (e.g. an ngrok URL) takes precedence
    // over the standard `API_ROOT_URL` so a tunnelled API can be addressed
    // without rewriting the regular root URL. Matches the convention already
    // used by the Telegram and WhatsApp webhook configurators.
    const apiBaseUrl = (process.env.AGENT_API_HOSTNAME ?? process.env.API_ROOT_URL ?? 'https://api.novu.co').replace(
      /\/$/,
      ''
    );
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
            'reaction_added',
            'reaction_removed',
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

  private async saveCredentials(
    command: SlackQuickSetupCommand,
    clientId: string,
    clientSecret: string,
    signingSecret: string,
    applicationId?: string
  ): Promise<void> {
    const credentials = encryptCredentials({
      clientId,
      secretKey: clientSecret,
      signingSecret,
      ...(applicationId && { applicationId }),
    });

    await this.integrationRepository.update(
      { _id: command.integrationId, _environmentId: command.environmentId, _organizationId: command.organizationId },
      {
        $set: {
          credentials,
          active: true,
        },
      }
    );
  }
}
