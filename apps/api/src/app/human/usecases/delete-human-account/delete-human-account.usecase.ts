import { Injectable } from '@nestjs/common';
import {
  buildMessageCountKey,
  buildSubscriberKey,
  InMemoryLRUCacheService,
  InMemoryLRUCacheStore,
  InvalidateCacheService,
} from '@novu/application-generic';
import {
  AgentRepository,
  CommunityOrganizationRepository,
  EnvironmentEntity,
  EnvironmentRepository,
  SubscriberRepository,
} from '@novu/dal';
import type { ClientSession, Model } from 'mongoose';
import { HumanBackingAccounts } from '../../services/human-backing-accounts.service';
import { HumanInviteTokenService } from '../../services/human-invite-token.service';
import { DeleteHumanAccountCommand } from './delete-human-account.command';

const ORGANIZATION_FIELD = '_organizationId';

type ContactRef = { subscriberId: string; _environmentId: string };

/**
 * Deletes a Human account for good: everything its backing organization owns, then the organization
 * itself the way deleting a Novu organization works (the hidden Clerk user and organization, Novu's
 * organization and user records, and the Stripe customer).
 *
 * The data goes first and in one transaction: the agent, its channels and their credentials, contacts,
 * asks, the environments with their API keys, and whatever else was written under the organization.
 * Once that is committed nothing can be reached anymore, so a failure in the steps after it (Clerk,
 * Stripe) leaves an empty organization behind, and deleting again finishes the job. Deleting twice is a
 * no-op.
 */
@Injectable()
export class DeleteHumanAccount {
  constructor(
    private readonly humanBackingAccounts: HumanBackingAccounts,
    private readonly communityOrganizationRepository: CommunityOrganizationRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly agentRepository: AgentRepository,
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

    if (organization) {
      await this.deleteOrganizationData(organization._id);
    }

    await this.humanBackingAccounts.delete(command.humanUserId);
  }

  private async deleteOrganizationData(organizationId: string): Promise<void> {
    // Read before the delete: afterwards there's nothing left to tell which links and caches were theirs.
    const [environments, relayAgents, contacts] = await Promise.all([
      this.environmentRepository.findOrganizationEnvironments(organizationId),
      this.agentRepository.find({ _organizationId: organizationId, runtime: 'human_relay' }, ['_id', '_environmentId']),
      this.subscriberRepository.find({ _organizationId: organizationId }, 'subscriberId _environmentId') as Promise<
        ContactRef[]
      >,
    ]);

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
      for (const model of this.organizationScopedModels()) {
        await model.deleteMany({ [ORGANIZATION_FIELD]: organizationId }, sessionOptions(session));
      }
    });

    await this.forgetCached(environments, contacts);
  }

  /**
   * Every collection whose documents belong to an organization. Asked from the models instead of listed
   * here, so a collection added later is cleaned up too. `deleteMany` on the model removes the documents
   * for real, including the ones a repository would only mark as deleted (integrations and their
   * credentials, for one).
   */
  private organizationScopedModels(): Model<unknown>[] {
    const models = Object.values(this.environmentRepository._model.db.models) as Model<unknown>[];

    return models.filter((model) => Boolean(model.schema.path(ORGANIZATION_FIELD)));
  }

  /**
   * The keys and contacts are gone from the database, but copies can still sit in caches. This clears
   * what can be reached from here; an API key can keep working on other API instances until their
   * in-memory copy runs out (a minute at most).
   */
  private async forgetCached(environments: EnvironmentEntity[], contacts: ContactRef[]): Promise<void> {
    for (const environment of environments) {
      for (const apiKey of environment.apiKeys ?? []) {
        if (apiKey.hash) {
          this.inMemoryLRUCacheService.invalidate(InMemoryLRUCacheStore.API_KEY_USER, apiKey.hash);
        }
      }
    }

    for (const { subscriberId, _environmentId } of contacts) {
      const ref = { subscriberId, _environmentId: String(_environmentId) };

      await this.invalidateCache.invalidateByKey({ key: buildSubscriberKey(ref) });
      await this.invalidateCache.invalidateQuery({ key: buildMessageCountKey().invalidate(ref) });
    }
  }
}

function sessionOptions(session: ClientSession | null): { session?: ClientSession } {
  return session ? { session } : {};
}
