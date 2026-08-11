import { expect } from 'chai';
import { ACTIVITY_KINDS, ACTIVITY_VIEW_MEMBERSHIP, compileActivityViewMatch, getKindsForView } from './activity-views';
import { ConversationActivitySenderTypeEnum, ConversationActivityTypeEnum } from './conversation-activity.entity';

describe('activity-views', () => {
  it('routes every kind into at least one view so no row becomes invisible everywhere', () => {
    for (const kind of ACTIVITY_KINDS) {
      expect(ACTIVITY_VIEW_MEMBERSHIP[kind].length).to.be.greaterThan(0);
    }
  });

  it('shows run lifecycle to clients but hides it from agent handoff history', () => {
    const lifecycle = ['run_start', 'run_finish', 'run_error'];

    expect(getKindsForView('client_events')).to.include.members(lifecycle);
    for (const kind of lifecycle) {
      expect(getKindsForView('agent_handoff')).to.not.include(kind);
      expect(getKindsForView('llm_transcript')).to.not.include(kind);
    }
  });

  it('keeps human messages in approval_activities so the approval requester can be resolved', () => {
    expect(getKindsForView('approval_activities')).to.include.members(['message.subscriber', 'message.platform_user']);
  });

  it('matches every kind in the view and nothing else', () => {
    const match = compileActivityViewMatch('llm_transcript');

    expect(match.$or).to.deep.equal([
      {
        type: ConversationActivityTypeEnum.MESSAGE,
        senderType: ConversationActivitySenderTypeEnum.SUBSCRIBER,
      },
      {
        type: ConversationActivityTypeEnum.MESSAGE,
        senderType: ConversationActivitySenderTypeEnum.AGENT,
      },
    ]);
  });

  it('discriminates tool-use signals from other signals without a stored kind', () => {
    const handoff = compileActivityViewMatch('agent_handoff').$or ?? [];
    const timeline = compileActivityViewMatch('operator_timeline').$or ?? [];

    expect(handoff).to.deep.include({
      type: ConversationActivityTypeEnum.SIGNAL,
      'signalData.type': 'tool-use',
    });
    expect(timeline).to.deep.include({
      type: ConversationActivityTypeEnum.SIGNAL,
      $nor: [{ 'signalData.type': 'tool-use' }],
    });
    expect(timeline).to.not.deep.include({
      type: ConversationActivityTypeEnum.SIGNAL,
      'signalData.type': 'tool-use',
    });
  });
});
