import { McpConnectionScopeEnum } from '@novu/shared';
import { FilterQuery } from 'mongoose';

import type { EnforceEnvOrOrgIds } from '../../types';
import { BaseRepositoryV2 } from '../base-repository-v2';
import { McpConnectionDBModel, McpConnectionEntity } from './mcp-connection.entity';
import { McpConnection } from './mcp-connection.schema';

export class McpConnectionRepository extends BaseRepositoryV2<
  McpConnectionDBModel,
  McpConnectionEntity,
  EnforceEnvOrOrgIds
> {
  constructor() {
    super(McpConnection, McpConnectionEntity);
  }

  /**
   * Lookup the subscriber-scope connection for a given (agent_mcp_server,
   * subscriber). Returns `null` when the subscriber has not yet authorised.
   */
  async findSubscriberConnection({
    organizationId,
    environmentId,
    agentMcpServerId,
    subscriberId,
  }: {
    organizationId: string;
    environmentId: string;
    agentMcpServerId: string;
    subscriberId: string;
  }): Promise<McpConnectionEntity | null> {
    return this.findOne(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        _agentMcpServerId: agentMcpServerId,
        _subscriberId: subscriberId,
        scope: McpConnectionScopeEnum.Subscriber,
      },
      '*'
    );
  }

  /**
   * List all connections that belong to a given enabled MCP. Used during
   * cascade-deletes when an MCP is disabled on an agent.
   */
  async findByAgentMcpServer({
    organizationId,
    environmentId,
    agentMcpServerId,
  }: {
    organizationId: string;
    environmentId: string;
    agentMcpServerId: string;
  }): Promise<McpConnectionEntity[]> {
    const query: FilterQuery<McpConnectionDBModel> & EnforceEnvOrOrgIds = {
      _environmentId: environmentId,
      _organizationId: organizationId,
      _agentMcpServerId: agentMcpServerId,
    };

    return this.find(query, '*');
  }

  /**
   * Return the scoped vault id (`auth.externalVaultId`) for a subscriber on an
   * agent, reusing any sibling MCP connection row that already owns a vault.
   */
  async findSubscriberExternalVaultId({
    organizationId,
    environmentId,
    subscriberId,
    agentMcpServerIds,
  }: {
    organizationId: string;
    environmentId: string;
    subscriberId: string;
    agentMcpServerIds: string[];
  }): Promise<string | null> {
    if (agentMcpServerIds.length === 0) {
      return null;
    }

    // Narrow projection: only the `auth` subdocument is read on this
    // hot-path lookup. Avoids pulling the full `oauthClient` document
    // (RFC 7591 client + registration access token) on every managed-agent
    // turn. The DAL projection types don't model dotted-path projections,
    // so we project the whole `auth` field; the encrypted access/refresh
    // tokens it carries stay opaque (only `externalVaultId` is read here).
    const connection = await this.findOne(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        _subscriberId: subscriberId,
        scope: McpConnectionScopeEnum.Subscriber,
        _agentMcpServerId: { $in: agentMcpServerIds },
        'auth.externalVaultId': { $nin: [null, ''] },
      },
      { auth: 1 }
    );

    return connection?.auth?.externalVaultId ?? null;
  }

  /**
   * List subscriber-scoped connections for an agent's enablement rows.
   */
  async findSubscriberConnectionsForAgent({
    organizationId,
    environmentId,
    subscriberId,
    agentMcpServerIds,
  }: {
    organizationId: string;
    environmentId: string;
    subscriberId: string;
    agentMcpServerIds: string[];
  }): Promise<McpConnectionEntity[]> {
    if (agentMcpServerIds.length === 0) {
      return [];
    }

    return this.find(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        _subscriberId: subscriberId,
        scope: McpConnectionScopeEnum.Subscriber,
        _agentMcpServerId: { $in: agentMcpServerIds },
      },
      '*'
    );
  }

  /**
   * Race-safe `setIfMissing` for `auth.externalVaultId` on a subscriber's MCP
   * rows. Only rows whose `auth.externalVaultId` is currently absent / null /
   * empty are updated, so two concurrent vault-creation racers converge on the
   * first writer's value instead of clobbering each other. Returns the count
   * of rows that actually changed; callers re-read to learn the winning vault
   * id when they need it.
   */
  async setSubscriberExternalVaultIdIfMissing({
    organizationId,
    environmentId,
    subscriberId,
    agentMcpServerIds,
    externalVaultId,
  }: {
    organizationId: string;
    environmentId: string;
    subscriberId: string;
    agentMcpServerIds: string[];
    externalVaultId: string;
  }): Promise<number> {
    if (agentMcpServerIds.length === 0) {
      return 0;
    }

    const result = await this.update(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        _subscriberId: subscriberId,
        scope: McpConnectionScopeEnum.Subscriber,
        _agentMcpServerId: { $in: agentMcpServerIds },
        $or: [{ 'auth.externalVaultId': { $exists: false } }, { 'auth.externalVaultId': { $in: [null, ''] } }],
      },
      { $set: { 'auth.externalVaultId': externalVaultId } }
    );

    return result.modified;
  }

  /**
   * Race-safe `setIfMissing` for `auth.externalVaultId` on a single connection
   * row. Returns `true` when this caller's id won the claim, `false` when
   * another writer set a different id first (the caller's upstream vault is
   * then orphan and should be logged for cleanup).
   */
  async setConnectionExternalVaultIdIfMissing({
    connectionId,
    organizationId,
    environmentId,
    externalVaultId,
  }: {
    connectionId: string;
    organizationId: string;
    environmentId: string;
    externalVaultId: string;
  }): Promise<boolean> {
    const result = await this.update(
      {
        _id: connectionId,
        _environmentId: environmentId,
        _organizationId: organizationId,
        $or: [{ 'auth.externalVaultId': { $exists: false } }, { 'auth.externalVaultId': { $in: [null, ''] } }],
      },
      { $set: { 'auth.externalVaultId': externalVaultId } }
    );

    return result.modified > 0;
  }

  /**
   * Repoint every subscriber-scoped connection from `fromSubscriberId` to
   * `toSubscriberId` (both Mongo `Subscriber._id`s). Used by the email adoption
   * merge so a phantom's tool grants follow the surviving real subscriber.
   *
   * The partial unique index on `(_agentMcpServerId, _subscriberId, mcpId)`
   * means a blind move would throw E11000 when the destination already owns a
   * connection for the same enablement — in that case the real subscriber's
   * credentials win and the phantom row is dropped instead of moved. Source
   * rows are deduped by the same key (rows outside the partial index — e.g. a
   * null `_agentMcpServerId` — are not covered by its uniqueness guarantee), so
   * both branches reduce to a single bulk write.
   */
  async repointSubscriberConnections(params: {
    environmentId: string;
    organizationId: string;
    fromSubscriberId: string;
    toSubscriberId: string;
  }): Promise<{ moved: number; dropped: number }> {
    const { environmentId, organizationId, fromSubscriberId, toSubscriberId } = params;

    const sourceRows = await this.find(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        _subscriberId: fromSubscriberId,
        scope: McpConnectionScopeEnum.Subscriber,
      },
      ['_id', '_agentMcpServerId', 'mcpId']
    );

    if (sourceRows.length === 0) {
      return { moved: 0, dropped: 0 };
    }

    const destinationRows = await this.find(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        _subscriberId: toSubscriberId,
        scope: McpConnectionScopeEnum.Subscriber,
      },
      ['_agentMcpServerId', 'mcpId']
    );

    const claimedKeys = new Set(destinationRows.map((row) => `${row._agentMcpServerId}:${row.mcpId}`));
    const droppedIds: string[] = [];
    const movedIds: string[] = [];

    for (const row of sourceRows) {
      const key = `${row._agentMcpServerId}:${row.mcpId}`;

      if (claimedKeys.has(key)) {
        droppedIds.push(row._id);
      } else {
        claimedKeys.add(key);
        movedIds.push(row._id);
      }
    }

    if (droppedIds.length > 0) {
      await this.delete({ _id: { $in: droppedIds }, _environmentId: environmentId, _organizationId: organizationId });
    }

    if (movedIds.length > 0) {
      await this.update(
        { _id: { $in: movedIds }, _environmentId: environmentId, _organizationId: organizationId },
        { $set: { _subscriberId: toSubscriberId } }
      );
    }

    return { moved: movedIds.length, dropped: droppedIds.length };
  }
}
