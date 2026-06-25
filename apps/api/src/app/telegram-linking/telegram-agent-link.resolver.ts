import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AgentIntegrationRepository, AgentRepository } from '@novu/dal';
import Axios from 'axios';

const TELEGRAM_API_TIMEOUT_MS = 10_000;
const WEBHOOK_AGENT_ID_PATTERN = /\/v1\/agents\/([^/]+)\/webhook\//;

export interface ResolvedTelegramAgent {
  agentId: string;
  agentIdentifier: string;
  agentName: string;
}

interface TelegramGetWebhookInfoResponse {
  ok: boolean;
  result?: { url?: string };
}

/**
 * Resolves which agent owns a Telegram integration without the caller passing an
 * agent identifier. A Telegram integration is linked to a single agent in the
 * common case (enforced when adding the link). For legacy data where the same
 * integration was linked to multiple agents, the bot can only point its webhook
 * at one agent, so the configured webhook URL is used as a deterministic
 * tiebreaker.
 */
@Injectable()
export class TelegramAgentLinkResolver {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository
  ) {}

  async resolve(params: {
    integrationId: string;
    environmentId: string;
    organizationId: string;
    /** Bot token, supplied only when the caller already decrypted it (configure). */
    botToken?: string;
  }): Promise<ResolvedTelegramAgent> {
    const links = await this.agentIntegrationRepository.find(
      {
        _integrationId: params.integrationId,
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
      },
      ['_agentId']
    );

    if (links.length === 0) {
      throw new NotFoundException('This Telegram integration is not linked to any agent.');
    }

    let agentId: string;
    if (links.length === 1) {
      agentId = links[0]._agentId;
    } else {
      agentId = await this.disambiguateByWebhookOwner(
        links.map((link) => link._agentId),
        params.botToken
      );
    }

    const agent = await this.agentRepository.findOne(
      {
        _id: agentId,
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
      },
      ['_id', 'identifier', 'name']
    );

    if (!agent) {
      throw new NotFoundException('The agent linked to this Telegram integration was not found.');
    }

    return { agentId: agent._id, agentIdentifier: agent.identifier, agentName: agent.name };
  }

  private async disambiguateByWebhookOwner(candidateAgentIds: string[], botToken?: string): Promise<string> {
    if (!botToken) {
      throw new ConflictException(
        'This Telegram integration is linked to multiple agents. Configure the webhook for a single agent first.'
      );
    }

    let configuredAgentId: string | null = null;
    try {
      const { data } = await Axios.get<TelegramGetWebhookInfoResponse>(
        `https://api.telegram.org/bot${botToken}/getWebhookInfo`,
        { timeout: TELEGRAM_API_TIMEOUT_MS, maxRedirects: 0, validateStatus: () => true }
      );
      const match = data.result?.url ? WEBHOOK_AGENT_ID_PATTERN.exec(data.result.url) : null;
      configuredAgentId = match ? match[1] : null;
    } catch {
      configuredAgentId = null;
    }

    if (configuredAgentId && candidateAgentIds.includes(configuredAgentId)) {
      return configuredAgentId;
    }

    throw new ConflictException(
      'This Telegram integration is linked to multiple agents and the active webhook owner could not be determined.'
    );
  }
}
