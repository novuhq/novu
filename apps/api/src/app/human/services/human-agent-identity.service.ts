import { Injectable } from '@nestjs/common';
import { decryptCredentials } from '@novu/application-generic';
import {
  AgentEntity,
  AgentIntegrationRepository,
  AgentRepository,
  IntegrationEntity,
  IntegrationRepository,
} from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';
import { SyncAgentEmailSenderName } from '../../agents/email/sync-agent-email-sender-name.service';
import { WhatsAppBusinessProfile } from '../../integrations/usecases/whatsapp/whatsapp-business-profile.service';
import { TelegramBotProfile, type TelegramBotProfileFields } from '../../telegram-linking/telegram-bot-profile.service';

export type HumanAgentIdentity = {
  /** Left as it is when missing or blank: an agent always has a name. */
  name?: string;
  /** An empty one clears the description. */
  description?: string;
};

/**
 * Who a relay agent is to the people it talks to: its name and its description. Saving a change here
 * also carries it to where people see it, which is the sender of its emails, its Telegram bots and the
 * profile of its WhatsApp business numbers. The invite and approve pages read the agent itself, so they
 * follow on their own.
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
    private readonly telegramBotProfile: TelegramBotProfile,
    private readonly whatsAppBusinessProfile: WhatsAppBusinessProfile
  ) {}

  /**
   * Saves what differs from the agent as it is, and returns the agent as it is now.
   *
   * The agent's own record is saved last. A change counts as made only once it is there, so when carrying
   * it to the emails or the bots fails, sending the same change again does the whole thing over.
   */
  async apply(agent: AgentEntity, identity: HumanAgentIdentity): Promise<AgentEntity> {
    const changes = this.changesFor(agent, identity);
    if (Object.keys(changes).length === 0) {
      return agent;
    }

    if (changes.name) {
      await this.syncAgentEmailSenderName.execute(
        { agentId: agent._id, environmentId: agent._environmentId, organizationId: agent._organizationId },
        changes.name
      );
    }

    await this.updateChannelProfiles(agent, changes);

    const scope = { _environmentId: agent._environmentId, _organizationId: agent._organizationId };
    await this.agentRepository.updateOne({ _id: agent._id, ...scope }, { $set: changes });

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

  /**
   * Carries a change to every Telegram bot and WhatsApp business number the agent speaks through. A WhatsApp
   * number takes no name: Meta reviews every display name change.
   */
  async updateChannelProfiles(agent: AgentEntity, changes: TelegramBotProfileFields): Promise<void> {
    const scope = { _environmentId: agent._environmentId, _organizationId: agent._organizationId };
    const links = await this.agentIntegrationRepository.find({ _agentId: agent._id, ...scope }, ['_integrationId']);
    if (links.length === 0) {
      return;
    }

    const integrations = await this.integrationRepository.find(
      {
        _id: { $in: links.map((link) => link._integrationId) },
        providerId: { $in: [ChatProviderIdEnum.Telegram, ChatProviderIdEnum.WhatsAppBusiness] },
        ...scope,
      },
      '_id providerId credentials'
    );

    const sharedNumbers = await this.whatsAppNumbersSharedWithOthers(agent, integrations);

    await Promise.all(
      integrations.map((integration) => {
        const credentials = decryptCredentials(integration.credentials ?? {});

        if (integration.providerId === ChatProviderIdEnum.WhatsAppBusiness) {
          const { name: _name, ...profile } = changes;
          const accessToken = credentials.apiToken;
          const phoneNumberId = credentials.phoneNumberIdentification;

          // A number not connected yet gets its profile when the signup finishes. A number other agents speak
          // through too keeps the profile it has: one agent's change shouldn't show up as another's.
          return accessToken && phoneNumberId && !sharedNumbers.has(String(integration._id))
            ? this.whatsAppBusinessProfile.apply(
                { accessToken, phoneNumberId, isNovuManaged: Boolean(credentials.isNovuManaged) },
                profile
              )
            : undefined;
        }

        const botToken = credentials.apiToken;

        // A bot without a token yet gets its profile when the token is saved.
        return botToken ? this.telegramBotProfile.apply(botToken, changes) : undefined;
      })
    );
  }

  /** The WhatsApp integrations among these that another agent is linked to as well. */
  private async whatsAppNumbersSharedWithOthers(
    agent: AgentEntity,
    integrations: Pick<IntegrationEntity, '_id' | 'providerId'>[]
  ): Promise<Set<string>> {
    const ids = integrations
      .filter((integration) => integration.providerId === ChatProviderIdEnum.WhatsAppBusiness)
      .map((integration) => integration._id);
    if (ids.length === 0) {
      return new Set();
    }

    const otherLinks = await this.agentIntegrationRepository.find(
      {
        _integrationId: { $in: ids },
        _agentId: { $ne: agent._id },
        _environmentId: agent._environmentId,
        _organizationId: agent._organizationId,
      },
      ['_integrationId']
    );

    return new Set(otherLinks.map((link) => String(link._integrationId)));
  }
}
