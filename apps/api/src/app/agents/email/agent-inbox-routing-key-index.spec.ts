import { agentInboxRoutingKeyPartialFilter, EmailProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import {
  AGENT_INBOX_ROUTING_KEY_INDEX,
  type AgentInboxRoutingKeyCollection,
  recreateAgentInboxRoutingKeyIndex,
} from '../../../../migrations/agent-email-inbox-routing-key-index/recreate-agent-inbox-routing-key-index.migration';

describe('recreate agent inbox routing key index', () => {
  it('drops the existing routing-key index and recreates it for both inbox providers', async () => {
    const dropped: string[] = [];
    let created: { keys: Record<string, number>; options: Record<string, unknown> } | undefined;
    const collection = {
      indexes: async () => [
        { name: 'credentials.inboxRoutingKey_1', key: { 'credentials.inboxRoutingKey': 1 } },
        { name: '_id_', key: { _id: 1 } },
      ],
      dropIndex: async (name: string) => {
        dropped.push(name);
      },
      createIndex: async (keys: Record<string, number>, options: Record<string, unknown>) => {
        created = { keys, options };

        return options.name as string;
      },
    };

    await recreateAgentInboxRoutingKeyIndex(collection as unknown as AgentInboxRoutingKeyCollection);

    expect(dropped).to.deep.equal(['credentials.inboxRoutingKey_1']);
    expect(created?.keys).to.deep.equal({ 'credentials.inboxRoutingKey': 1 });
    expect(created?.options.name).to.equal(AGENT_INBOX_ROUTING_KEY_INDEX);
    expect(created?.options.unique).to.equal(true);
    const filter = created?.options.partialFilterExpression as {
      providerId: { $in: string[] };
    };
    expect(filter.providerId.$in).to.include(EmailProviderIdEnum.NovuAgent);
    expect(filter.providerId.$in).to.include(EmailProviderIdEnum.AgentEmailInbox);
  });

  it('creates the index when none exists yet', async () => {
    let created = false;
    const collection = {
      indexes: async () => [{ name: '_id_', key: { _id: 1 } }],
      dropIndex: async () => {
        throw new Error('should not drop');
      },
      createIndex: async () => {
        created = true;

        return AGENT_INBOX_ROUTING_KEY_INDEX;
      },
    };

    await recreateAgentInboxRoutingKeyIndex(collection as unknown as AgentInboxRoutingKeyCollection);

    expect(created).to.equal(true);
  });

  it('leaves an index that already covers both inbox providers in place', async () => {
    let dropped = false;
    let created = false;
    const collection = {
      indexes: async () => [
        {
          name: AGENT_INBOX_ROUTING_KEY_INDEX,
          key: { 'credentials.inboxRoutingKey': 1 },
          unique: true,
          partialFilterExpression: agentInboxRoutingKeyPartialFilter(),
        },
      ],
      dropIndex: async () => {
        dropped = true;
      },
      createIndex: async () => {
        created = true;

        return AGENT_INBOX_ROUTING_KEY_INDEX;
      },
    };

    await recreateAgentInboxRoutingKeyIndex(collection as unknown as AgentInboxRoutingKeyCollection);

    expect(dropped).to.equal(false);
    expect(created).to.equal(false);
  });

  it('restores the previous index when the widened index cannot be created', async () => {
    const previousFilter = {
      providerId: EmailProviderIdEnum.NovuAgent,
      'credentials.inboxRoutingKey': { $type: 'string' },
    };
    const created: Array<Record<string, unknown>> = [];
    const collection = {
      indexes: async () => [
        {
          name: 'credentials.inboxRoutingKey_1',
          key: { 'credentials.inboxRoutingKey': 1 },
          unique: true,
          partialFilterExpression: previousFilter,
        },
      ],
      dropIndex: async () => undefined,
      createIndex: async (_keys: unknown, options: Record<string, unknown>) => {
        created.push(options);
        if (created.length === 1) {
          throw new Error('create failed');
        }

        return options.name as string;
      },
    };

    try {
      await recreateAgentInboxRoutingKeyIndex(collection as unknown as AgentInboxRoutingKeyCollection);
      throw new Error('expected the widened create to fail');
    } catch (error) {
      expect((error as Error).message).to.equal('create failed');
    }

    expect(created).to.have.length(2);
    expect(created[1]?.partialFilterExpression).to.equal(previousFilter);
    expect(created[1]?.name).to.equal('credentials.inboxRoutingKey_1');
  });
});
