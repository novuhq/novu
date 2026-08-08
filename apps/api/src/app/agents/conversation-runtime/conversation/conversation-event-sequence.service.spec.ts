import { ConversationActivityRepository, ConversationRepository } from '@novu/dal';
import { expect } from 'chai';
import sinon from 'sinon';
import { ConversationEventSequenceService } from './conversation-event-sequence.service';

describe('ConversationEventSequenceService', () => {
  function makeService(
    conversationRepository: Partial<ConversationRepository>,
    activityRepository: Partial<ConversationActivityRepository> = {}
  ) {
    return new ConversationEventSequenceService(
      conversationRepository as ConversationRepository,
      activityRepository as ConversationActivityRepository
    );
  }

  describe('mint', () => {
    it('initializes the high-watermark above existing history rows', async () => {
      const conversationRepository = {
        findOne: sinon.stub().resolves({ _id: 'conv-1', eventSequence: 0 }),
        allocateEventSequence: sinon.stub().resolves(3),
      };
      const activityRepository = {
        countActivities: sinon.stub().resolves(2),
      };
      const service = makeService(conversationRepository, activityRepository);

      const sequence = await service.mint({
        environmentId: 'env-1',
        organizationId: 'org-1',
        conversationId: 'conv-1',
      });

      expect(sequence).to.equal(3);
      expect(
        (conversationRepository.allocateEventSequence as sinon.SinonStub).calledOnceWithExactly(
          'env-1',
          'org-1',
          'conv-1',
          2
        )
      ).to.equal(true);
    });

    it('skips the legacy bootstrap count when the high-watermark is already set', async () => {
      const conversationRepository = {
        findOne: sinon.stub().resolves({ _id: 'conv-1', eventSequence: 3 }),
        allocateEventSequence: sinon.stub().resolves(4),
      };
      const activityRepository = {
        countActivities: sinon.stub(),
      };
      const service = makeService(conversationRepository, activityRepository);

      const sequence = await service.mint({
        environmentId: 'env-1',
        organizationId: 'org-1',
        conversationId: 'conv-1',
      });

      expect(sequence).to.equal(4);
      expect((activityRepository.countActivities as sinon.SinonStub).called).to.equal(false);
    });
  });
});
