import type { EnforceEnvOrOrgIds } from '../../types';
import { BaseRepositoryV2 } from '../base-repository-v2';
import {
  type SubscriberAgentVaultConnection,
  type SubscriberAgentVaultConnectionStatus,
  SubscriberAgentVaultDBModel,
  SubscriberAgentVaultEntity,
} from './subscriber-agent-vault.entity';
import { SubscriberAgentVault } from './subscriber-agent-vault.schema';

const DUPLICATE_KEY_ERROR_CODE = 11_000;

export class SubscriberAgentVaultRepository extends BaseRepositoryV2<
  SubscriberAgentVaultDBModel,
  SubscriberAgentVaultEntity,
  EnforceEnvOrOrgIds
> {
  constructor() {
    super(SubscriberAgentVault, SubscriberAgentVaultEntity);
  }

  /**
   * Race-safe upsert. Tries to insert the supplied Anthropic vault id; if another
   * writer already did so, returns the existing doc and marks `wasCreated: false`
   * so the caller can archive the now-duplicate Anthropic vault on their side.
   *
   * Relies on the unique index over (_environmentId, subscriberId, _agentId).
   */
  async upsertVault(params: {
    organizationId: string;
    environmentId: string;
    subscriberId: string;
    agentId: string;
    anthropicVaultId: string;
  }): Promise<{ doc: SubscriberAgentVaultEntity; wasCreated: boolean }> {
    try {
      const created = await this.create({
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
        subscriberId: params.subscriberId,
        _agentId: params.agentId,
        anthropicVaultId: params.anthropicVaultId,
        connections: [],
      });

      return { doc: created, wasCreated: true };
    } catch (err) {
      if (!isDuplicateKeyError(err)) {
        throw err;
      }
    }

    const existing = await this.findForSubscriberAgent(params);
    if (!existing) {
      throw new Error('Subscriber agent vault disappeared after duplicate-key collision.');
    }

    return { doc: existing, wasCreated: false };
  }

  async findForSubscriberAgent(params: {
    organizationId: string;
    environmentId: string;
    subscriberId: string;
    agentId: string;
  }): Promise<SubscriberAgentVaultEntity | null> {
    return this.findOne(
      {
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
        subscriberId: params.subscriberId,
        _agentId: params.agentId,
      },
      '*'
    );
  }

  async upsertConnection(params: {
    organizationId: string;
    environmentId: string;
    vaultId: string;
    connection: SubscriberAgentVaultConnection;
  }): Promise<void> {
    // Replace any existing entry for the same mcpServerName, then push the new one.
    await this.updateOne(
      {
        _id: params.vaultId,
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
      },
      {
        $pull: { connections: { mcpServerName: params.connection.mcpServerName } },
      }
    );

    await this.updateOne(
      {
        _id: params.vaultId,
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
      },
      {
        $push: { connections: params.connection },
      }
    );
  }

  async removeConnection(params: {
    organizationId: string;
    environmentId: string;
    vaultId: string;
    mcpServerName: string;
  }): Promise<void> {
    await this.updateOne(
      {
        _id: params.vaultId,
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
      },
      {
        $pull: { connections: { mcpServerName: params.mcpServerName } },
      }
    );
  }

  async markConnectionStatus(params: {
    organizationId: string;
    environmentId: string;
    vaultId: string;
    mcpServerName: string;
    status: SubscriberAgentVaultConnectionStatus;
  }): Promise<void> {
    await this.updateOne(
      {
        _id: params.vaultId,
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
        'connections.mcpServerName': params.mcpServerName,
      },
      {
        $set: { 'connections.$.status': params.status },
      }
    );
  }

  async findAllForAgent(params: {
    organizationId: string;
    environmentId: string;
    agentId: string;
  }): Promise<SubscriberAgentVaultEntity[]> {
    return this.find(
      {
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
        _agentId: params.agentId,
      },
      '*'
    );
  }

  async findAllForSubscriber(params: {
    organizationId: string;
    environmentId: string;
    subscriberId: string;
  }): Promise<SubscriberAgentVaultEntity[]> {
    return this.find(
      {
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
        subscriberId: params.subscriberId,
      },
      '*'
    );
  }

  async deleteOne(params: { organizationId: string; environmentId: string; vaultId: string }): Promise<void> {
    await this.delete({
      _id: params.vaultId,
      _environmentId: params.environmentId,
      _organizationId: params.organizationId,
    });
  }
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: number }).code === DUPLICATE_KEY_ERROR_CODE
  );
}
