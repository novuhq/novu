import { ConversationParticipantTypeEnum } from '@novu/dal';
import { expect } from 'chai';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { recoverEmailFromParticipants, recoverSubscriberParticipantId } from './handle-pending-tool-approvals.helpers';

describe('HandlePendingToolApprovals helpers', () => {
  describe('recoverSubscriberParticipantId', () => {
    it('returns the subscriber participant id when the conversation was upgraded', () => {
      const result = recoverSubscriberParticipantId([
        { type: ConversationParticipantTypeEnum.SUBSCRIBER, id: 'sub-upgraded' },
      ]);

      expect(result).to.equal('sub-upgraded');
    });

    it('returns null when only platform participants exist', () => {
      const result = recoverSubscriberParticipantId([
        { type: ConversationParticipantTypeEnum.PLATFORM_USER, id: 'email:user@example.com' },
      ]);

      expect(result).to.equal(null);
    });
  });

  describe('recoverEmailFromParticipants', () => {
    it('recovers the email from an email platform participant', () => {
      const result = recoverEmailFromParticipants(
        [{ type: ConversationParticipantTypeEnum.PLATFORM_USER, id: 'email:user@example.com' }],
        AgentPlatformEnum.EMAIL
      );

      expect(result).to.equal('user@example.com');
    });
  });
});
