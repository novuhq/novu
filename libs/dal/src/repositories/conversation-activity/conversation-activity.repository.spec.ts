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
});
