import { Injectable } from '@nestjs/common';
import {
  buildMessageCountKey,
  buildSubscriberKey,
  InMemoryLRUCacheService,
  InMemoryLRUCacheStore,
  InvalidateCacheService,
} from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  AgentMcpServerRepository,
  AgentRepository,
  ChannelConnectionRepository,
  ChannelEndpointRepository,
  CommunityOrganizationRepository,
  ConversationActivityRepository,
  ConversationRepository,
  EnvironmentEntity,
  EnvironmentRepository,
  HumanContactRepository,
  HumanInteractionRepository,
  IntegrationRepository,
  McpConnectionRepository,
  SubscriberRepository,
} from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { HumanBackingAccounts } from '../../services/human-backing-accounts.service';
import { HumanInviteTokenService } from '../../services/human-invite-token.service';
import { DeleteHumanAccountCommand } from './delete-human-account.command';

type ContactRef = { subscriberId: string; _environmentId: string };

/**
 * Deletes a Human account for good: what Human keeps in its backing organization, then the organization
 * itself the way deleting a Novu organization works (the hidden Clerk user and organization, Novu's
 * organization and user records, and the Stripe customer).
 *
 * Human's data goes first and in one transaction: the agent, its channels with their credentials,
 * contacts, asks and conversations. They are the same collections a setup made without an account moves
 * into an account when it is claimed (`ClaimKeylessConnect`). What Novu sets up for any organization
 * (environments, the in-app integration, layouts and so on) is left as it is for every deleted
 * organization.
 *
 * Once that is committed nobody can be reached anymore, so a failure in the steps after it (Clerk,
 * Stripe) leaves an organization without Human data behind, and deleting again finishes the job.
 * Deleting twice is a no-op.
 */
@Injectable()
export class DeleteHumanAccount {
  constructor(
    private readonly humanBackingAccounts: HumanBackingAccounts,
    private readonly communityOrganizationRepository: CommunityOrganizationRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly channelConnectionRepository: ChannelConnectionRepository,
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly conversationActivityRepository: ConversationActivityRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly mcpConnectionRepository: McpConnectionRepository,
    private readonly humanInteractionRepository: HumanInteractionRepository,
    private readonly humanContactRepository: HumanContactRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly inviteTokens: HumanInviteTokenService,
    private readonly invalidateCache: InvalidateCacheService,
    private readonly inMemoryLRUCacheService: InMemoryLRUCacheService
  ) {}

  async execute(command: DeleteHumanAccountCommand): Promise<void> {
    const account = await this.humanBackingAccounts.find(command.humanUserId);
    const organization = account?.clerkOrganizationId
      ? await this.communityOrganizationRepository.findOne({ externalId: account.clerkOrganizationId }, '_id')
      : null;
    // Read before anything is deleted: afterwards nothing says which keys were theirs.
    const environments = organization
      ? await this.environmentRepository.findOrganizationEnvironments(organization._id)
      : [];

    if (organization) {
      await this.deleteHumanData(organization._id);
    }

    await this.humanBackingAccounts.delete(command.humanUserId);

    this.forgetApiKeys(environments);
  }

  private async deleteHumanData(organizationId: string): Promise<void> {
    const scope = { _organizationId: organizationId };

    // Read before the delete: afterwards there's nothing left to tell which links and caches were theirs.
    const relayAgents = await this.agentRepository.find({ ...scope, runtime: 'human_relay' }, [
      '_id',
      '_environmentId',
    ]);
    const contacts = (await this.subscriberRepository.find(scope, 'subscriberId _environmentId')) as ContactRef[];

    // Links first, as when one contact is removed: nobody can connect while the rest is being taken away.
    for (const agent of relayAgents) {
      for (const contact of contacts) {
        if (String(contact._environmentId) === String(agent._environmentId)) {
          await this.inviteTokens.revokeAll({
            env: String(agent._environmentId),
            agentId: String(agent._id),
            subscriberId: contact.subscriberId,
          });
        }
      }
    }

    // Through a V2 repository: it only runs without a transaction where MongoDB can't do one at all.
    await this.agentRepository.withTransaction(async (session) => {
      // One after the other: operations of a transaction can't run in parallel.
      await this.humanInteractionRepository.delete(scope, { session });
      await this.humanContactRepository.delete(scope, { session });
      await this.conversationActivityRepository.delete(scope, { session });
      await this.conversationRepository.delete(scope, { session });
      await this.channelEndpointRepository.delete(scope, { session });
      await this.channelConnectionRepository.delete(scope, { session });
      await this.mcpConnectionRepository.delete(scope, { session });
      await this.agentMcpServerRepository.delete(scope, { session });
      await this.agentIntegrationRepository.delete(scope, { session });
      // On the model: the repository would only mark them as deleted and keep the bot tokens and secrets.
      await this.integrationRepository._model.deleteMany(
        { ...scope, channel: { $ne: ChannelTypeEnum.IN_APP } },
        session ? { session } : {}
      );
      await this.subscriberRepository.delete(scope, { session });
      await this.agentRepository.delete(scope, { session });
    });

    // The contacts are gone from the database, but copies of them can still sit in the cache.
    for (const { subscriberId, _environmentId } of contacts) {
      const ref = { subscriberId, _environmentId: String(_environmentId) };

      await this.invalidateCache.invalidateByKey({ key: buildSubscriberKey(ref) });
      await this.invalidateCache.invalidateQuery({ key: buildMessageCountKey().invalidate(ref) });
    }
  }

  /**
   * An API key stops working with the hidden user it belongs to, which is gone by now. Each API instance
   * remembers the keys it has seen for a minute, though: this forgets them here, and the other instances
   * follow when their copy runs out.
   */
  private forgetApiKeys(environments: EnvironmentEntity[]): void {
    for (const environment of environments) {
      for (const apiKey of environment.apiKeys ?? []) {
        if (apiKey.hash) {
          this.inMemoryLRUCacheService.invalidate(InMemoryLRUCacheStore.API_KEY_USER, apiKey.hash);
        }
      }
    }
  }
}
