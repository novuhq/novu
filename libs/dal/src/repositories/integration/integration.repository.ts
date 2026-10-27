import { AGENT_INBOX_PROVIDER_IDS, EmailProviderIdEnum, NOVU_PROVIDERS } from '@novu/shared';
import { ClientSession, FilterQuery, type QueryOptions } from 'mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import { DalException } from '../../shared';
import type { EnforceEnvOrOrgIds, IDeleteResult } from '../../types';

import { BaseRepository } from '../base-repository';
import { IntegrationDBModel, IntegrationEntity, ProviderCount } from './integration.entity';
import { Integration } from './integration.schema';

export type IntegrationQuery = FilterQuery<IntegrationDBModel> & EnforceEnvOrOrgIds;

export class IntegrationRepository extends BaseRepository<IntegrationDBModel, IntegrationEntity, EnforceEnvOrOrgIds> {
  private integration: SoftDeleteModel;
  constructor() {
    super(Integration, IntegrationEntity);
    this.integration = Integration;
  }

  async find(
    query: IntegrationQuery,
    select = '',
    options: { limit?: number; sort?: QueryOptions['sort']; skip?: number; session?: ClientSession | null } = {}
  ): Promise<IntegrationEntity[]> {
    return super.find(query, select, options);
  }

  async findByEnvironmentId(environmentId: string): Promise<IntegrationEntity[]> {
    return await this.find({
      _environmentId: environmentId,
    });
  }

  /**
   * Unscoped lookup of the agent inbox integration (Novu Email or Agent Email
   * Inbox) that owns a given inbox routing key. Used exclusively by the
   * inbound-email worker, which knows neither the env nor the org until it has
   * resolved the integration. Backed by the partial unique index
   * `{ 'credentials.inboxRoutingKey': 1 }` scoped to both inbox providers.
   *
   * More than one match means the uniqueness gate is down (the index rebuild
   * window, or a planted duplicate). Return null so the worker drops the
   * message instead of picking an arbitrary tenant.
   *
   * Mirrors `AgentRepository.findByIdForWebhook` — both bypass the standard
   * EnforceEnvOrOrgIds constraint because the inbound bootstrap legitimately
   * has nothing else to query by.
   */
  async findAgentInboundByInboxRoutingKey(inboxRoutingKey: string): Promise<IntegrationEntity | null> {
    const docs = await this.MongooseModel.find({
      providerId: { $in: [...AGENT_INBOX_PROVIDER_IDS] },
      'credentials.inboxRoutingKey': inboxRoutingKey,
    })
      .limit(2)
      .lean();

    const doc = docs[0];
    if (docs.length !== 1 || !doc) {
      return null;
    }

    return this.mapEntity(doc);
  }

  /**
   * Unscoped lookup of the vanity Agent Inbox (`{handle}@domain`) that claimed
   * a handle. Used by inbound mail, which knows neither the env nor the org.
   * Backed by `agent_inbox_vanity_slug`.
   *
   * More than one match means the uniqueness gate is down. Return null so the
   * worker drops the message instead of picking an arbitrary tenant.
   */
  async findAgentInboundByVanitySlug(emailSlugPrefix: string, inboxDomain: string): Promise<IntegrationEntity | null> {
    const docs = await this.MongooseModel.find(this.vanitySlugQuery(emailSlugPrefix, inboxDomain)).limit(2).lean();

    const doc = docs[0];
    if (docs.length !== 1 || !doc) {
      return null;
    }

    return this.mapEntity(doc);
  }

  /**
   * Whether any vanity inbox already holds this handle, including when more
   * than one does. Availability must treat that as taken. Inbound uses
   * {@link findAgentInboundByVanitySlug} and drops instead.
   */
  async hasAgentInboundByVanitySlug(emailSlugPrefix: string, inboxDomain: string): Promise<boolean> {
    const existing = await this.MongooseModel.exists(this.vanitySlugQuery(emailSlugPrefix, inboxDomain));

    return existing != null;
  }

  private vanitySlugQuery(emailSlugPrefix: string, inboxDomain: string) {
    return {
      providerId: EmailProviderIdEnum.AgentEmailInbox,
      'credentials.emailSlugPrefix': emailSlugPrefix,
      'credentials.inboxDomain': inboxDomain,
      'credentials.inboxRoutingKey': { $exists: false },
    };
  }

  async findHighestPriorityIntegration({
    _organizationId,
    _environmentId,
    channel,
  }: Pick<IntegrationEntity, '_environmentId' | '_organizationId' | 'channel'>) {
    return await this.findOne(
      {
        _organizationId,
        _environmentId,
        channel,
        active: true,
      },
      undefined,
      { query: { sort: { priority: -1 } } }
    );
  }

  async countActiveExcludingNovu({
    _organizationId,
    _environmentId,
    channel,
  }: Pick<IntegrationEntity, '_environmentId' | '_organizationId' | 'channel'>) {
    return await this.count({
      _organizationId,
      _environmentId,
      channel,
      active: true,
      providerId: {
        $nin: NOVU_PROVIDERS,
      },
    });
  }

  async create(data: IntegrationQuery, options: { session?: ClientSession | null } = {}): Promise<IntegrationEntity> {
    return await super.create(data, options);
  }

  async delete(query: IntegrationQuery, options: { session?: ClientSession | null } = {}) {
    const q = this.integration.delete({ _id: query._id, _organizationId: query._organizationId });
    if (options.session) q.session(options.session);

    return await q;
  }

  async deleteMany(query: IntegrationQuery): Promise<IDeleteResult> {
    const { _environmentId, _organizationId } = query || {};
    if (!_environmentId || !_organizationId) {
      throw new DalException(
        'Deletion operation blocked for missing any of these properties: [_environmentId, _organizationId]. We are avoiding a potential unexpected multiple deletion'
      );
    }

    const { acknowledged, modifiedCount, matchedCount } = await this.integration.delete(query);

    if (matchedCount === 0 || modifiedCount === 0) {
      throw new DalException(
        `Deletion of many integrations in environment ${_environmentId} and organization ${_organizationId}  was not performed properly`
      );
    }

    return {
      modifiedCount,
      matchedCount,
    };
  }

  async findDeleted(query: IntegrationQuery): Promise<IntegrationEntity> {
    const res: IntegrationEntity = await this.integration.findDeleted(query);

    return this.mapEntity(res);
  }

  async recalculatePriorityForAllActive({
    _id,
    _organizationId,
    _environmentId,
    channel,
  }: Pick<IntegrationEntity, '_environmentId' | '_organizationId' | 'channel'> & {
    _id?: string;
    exclude?: boolean;
  }) {
    const otherActiveIntegrations = await this.find(
      {
        _organizationId,
        _environmentId,
        channel,
        active: true,
        ...(_id && {
          _id: {
            $nin: [_id],
          },
        }),
      },
      '_id',
      { sort: { priority: -1 } }
    );

    let ids = otherActiveIntegrations.map((integration) => integration._id);
    if (_id) {
      ids = [_id, ...otherActiveIntegrations.map((integration) => integration._id)];
    }

    const promises = ids.map((id, index) =>
      this.update(
        {
          _id: id,
          _organizationId,
          _environmentId,
        },
        {
          $set: {
            priority: ids.length - index,
          },
        }
      )
    );
    await Promise.all(promises);
  }

  async sumByProviderId(): Promise<ProviderCount[]> {
    const res = await this.integration.aggregate<ProviderCount[]>([
      {
        $group: {
          _id: '$providerId',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          providerId: '$_id',
          count: 1,
        },
      },
    ]);

    return res;
  }
}
