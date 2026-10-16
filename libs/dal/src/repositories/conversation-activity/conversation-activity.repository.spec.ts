import { expect } from 'chai';
import { ConversationActivitySenderTypeEnum } from './conversation-activity.entity';
import { ConversationActivityRepository } from './conversation-activity.repository';

describe('ConversationActivityRepository', () => {
  it('upserts imported user activities as platform users', async () => {
    const repository = new ConversationActivityRepository();
    const model = (repository as any).MongooseModel;
    const originalBulkWrite = model.bulkWrite;
    let operations: any[] = [];
    model.bulkWrite = async (nextOperations: any[]) => {
      operations = nextOperations;

      return { upsertedCount: 1 };
    };

    try {
      const insertedCount = await repository.importUserActivities({
        conversationId: '66f000000000000000000001',
        platform: 'slack',
        integrationId: '66f000000000000000000002',
        platformThreadId: 'slack:C1:1.0',
        messages: [
          {
            identifier: 'slack_hist_conv_1',
            senderId: 'slack:B1',
            senderName: 'Deploy bot',
            content: 'deployment failed',
            platformMessageId: '1',
            sequence: 4,
          },
        ],
        environmentId: '66f000000000000000000003',
        organizationId: '66f000000000000000000004',
      });

      expect(insertedCount).to.equal(1);
      const operation = operations[0].updateOne;
      expect(String(operation.filter._environmentId)).to.equal('66f000000000000000000003');
      expect(operation.filter.identifier).to.equal('slack_hist_conv_1');
      expect(operation.update.$setOnInsert).to.include({
        senderType: ConversationActivitySenderTypeEnum.PLATFORM_USER,
        senderId: 'slack:B1',
        sequence: 4,
      });
      expect(operation.upsert).to.equal(true);
    } finally {
      model.bulkWrite = originalBulkWrite;
    }
  });

  describe('findInboxMessages', () => {
    const scope = {
      environmentId: '66f000000000000000000003',
      organizationId: '66f000000000000000000004',
      conversationId: '66f000000000000000000001',
    };

    /** Five messages a second apart, read through stubs that answer the way the database would. */
    function setup() {
      const rows = [1, 2, 3, 4, 5].map((n) => ({
        _id: `66f00000000000000000010${n}`,
        identifier: `m${n}`,
        type: 'message',
        senderType: 'subscriber',
        createdAt: new Date(Date.UTC(2026, 9, 15, 12, 0, n)).toISOString(),
      }));
      const repository = new ConversationActivityRepository() as any;
      const finds: Array<{ query: any; options: any }> = [];

      repository.findOne = async (query: { identifier: string }) =>
        rows.find((row) => row.identifier === query.identifier) ?? null;
      repository.find = async (query: any, _select: unknown, options: any) => {
        finds.push({ query, options });
        const bound = query.$and?.[0].$or[0].createdAt;
        const ascending = options.sort.createdAt === 1;
        const matching = rows.filter((row) => {
          const at = new Date(row.createdAt).getTime();

          if (bound?.$gt) return at > bound.$gt.getTime();
          if (bound?.$lt) return at < bound.$lt.getTime();

          return true;
        });
        const sorted = ascending ? matching : [...matching].reverse();

        return sorted.slice(0, options.limit);
      };
      repository.withoutInteractionCardCopies = async (_scope: unknown, batch: unknown[]) => batch;
      repository.foldViewPage = async (_params: unknown, batch: unknown[]) => batch;

      return { repository, finds };
    }

    it('reads the oldest messages after `after`, newest first, and says more came after them', async () => {
      const { repository, finds } = setup();

      const page = await repository.findInboxMessages({ ...scope, limit: 2, after: 'm2' });

      expect(page.data.map((row: { identifier: string }) => row.identifier)).to.deep.equal(['m4', 'm3']);
      expect(page.hasMore).to.equal(true);
      expect(finds[0].options.sort).to.deep.equal({ createdAt: 1, _id: 1 });
      expect(finds[0].query.$and[0].$or[1]._id).to.have.property('$gt');
    });

    it('says nothing more came once `after` reaches the newest message', async () => {
      const { repository } = setup();

      const tail = await repository.findInboxMessages({ ...scope, limit: 2, after: 'm4' });
      const nothing = await repository.findInboxMessages({ ...scope, limit: 2, after: 'm5' });

      expect(tail.data.map((row: { identifier: string }) => row.identifier)).to.deep.equal(['m5']);
      expect(tail.hasMore).to.equal(false);
      expect(nothing).to.deep.equal({ data: [], hasMore: false });
    });

    it('still reads back from `before`, newest first', async () => {
      const { repository, finds } = setup();

      const page = await repository.findInboxMessages({ ...scope, limit: 2, before: 'm4' });

      expect(page.data.map((row: { identifier: string }) => row.identifier)).to.deep.equal(['m3', 'm2']);
      expect(page.hasMore).to.equal(true);
      expect(finds[0].options.sort).to.deep.equal({ createdAt: -1, _id: -1 });
    });

    it('gives an empty page for a cursor that is no message of the thread', async () => {
      const { repository, finds } = setup();

      expect(await repository.findInboxMessages({ ...scope, limit: 2, after: 'nope' })).to.deep.equal({
        data: [],
        hasMore: false,
      });
      expect(await repository.findInboxMessages({ ...scope, limit: 2, before: 'nope' })).to.deep.equal({
        data: [],
        hasMore: false,
      });
      expect(finds).to.have.length(0);
    });
  });
});
