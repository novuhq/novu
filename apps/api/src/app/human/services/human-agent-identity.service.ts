import { Injectable } from '@nestjs/common';
import { decryptCredentials } from '@novu/application-generic';
import { AgentEntity, AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';
import { SyncAgentEmailSenderName } from '../../agents/email/sync-agent-email-sender-name.service';
import { TelegramBotProfile, type TelegramBotProfileFields } from '../../telegram-linking/telegram-bot-profile.service';

export type HumanAgentIdentity = {
  /** Left as it is when missing or blank: an agent always has a name. */
  name?: string;
  /** An empty one clears the description. */
  description?: string;
};

/**
 * Who a relay agent is to the people it talks to: its name and its description. Saving a change here
 * also carries it to where people see it, which is the sender of its emails and its Telegram bots. The
 * invite and approve pages read the agent itself, so they follow on their own.
 *
 * A Slack app can't be renamed from here: Slack only lets the token that made the app change it.
 */
@Injectable()
export class HumanAgentIdentityService {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly syncAgentEmailSenderName: SyncAgentEmailSenderName,
    private readonly telegramBotProfile: TelegramBotProfile
  ) {}

  /** Saves what differs from the agent as it is, and returns the agent as it is now. */
  async apply(agent: AgentEntity, identity: HumanAgentIdentity): Promise<AgentEntity> {
    const changes = this.changesFor(agent, identity);
    if (Object.keys(changes).length === 0) {
      return agent;
    }

    const scope = { _environmentId: agent._environmentId, _organizationId: agent._organizationId };
    await this.agentRepository.updateOne({ _id: agent._id, ...scope }, { $set: changes });

    if (changes.name) {
      await this.syncAgentEmailSenderName.execute(
        { agentId: agent._id, environmentId: agent._environmentId, organizationId: agent._organizationId },
        changes.name
      );
    }

    await this.updateTelegramBots(agent, changes);

    return { ...agent, ...changes };
  }

  private changesFor(agent: AgentEntity, identity: HumanAgentIdentity): HumanAgentIdentity {
    const name = identity.name?.trim();
    const description = identity.description?.trim();

    return {
      ...(name && name !== agent.name ? { name } : {}),
      ...(description !== undefined && description !== (agent.description ?? '') ? { description } : {}),
    };
  }

  /** Carries a change to every Telegram bot the agent speaks through. */
  async updateTelegramBots(agent: AgentEntity, changes: TelegramBotProfileFields): Promise<void> {
    const scope = { _environmentId: agent._environmentId, _organizationId: agent._organizationId };
    const links = await this.agentIntegrationRepository.find({ _agentId: agent._id, ...scope }, ['_integrationId']);
    if (links.length === 0) {
      return;
    }

    const bots = await this.integrationRepository.find(
      { _id: { $in: links.map((link) => link._integrationId) }, providerId: ChatProviderIdEnum.Telegram, ...scope },
      'credentials'
    );

    await Promise.all(
      bots.map((bot) => {
        const botToken = decryptCredentials(bot.credentials ?? {}).apiToken;

        // A bot without a token yet gets its profile when the token is saved.
        return botToken ? this.telegramBotProfile.apply(botToken, changes) : undefined;
      })
    );
  }
}
