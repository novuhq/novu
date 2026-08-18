import { expect } from 'chai';
import { ACTIVITY_KINDS, ACTIVITY_VIEW_MEMBERSHIP, compileActivityViewMatch, getKindsForView } from './activity-views';
import { ConversationActivitySenderTypeEnum, ConversationActivityTypeEnum } from './conversation-activity.entity';

describe('activity-views', () => {
  it('routes every kind into at least one view so no row becomes invisible everywhere', () => {
    for (const kind of ACTIVITY_KINDS) {
      expect(ACTIVITY_VIEW_MEMBERSHIP[kind].length).to.be.greaterThan(0);
    }
  });

  it('shows run lifecycle to clients only, since it is bookkeeping rather than conversation content', () => {
    const lifecycle = ['run_start', 'run_finish', 'run_error'];

    expect(getKindsForView('client_events')).to.include.members(lifecycle);
    for (const kind of lifecycle) {
      expect(getKindsForView('agent_handoff')).to.not.include(kind);
      expect(getKindsForView('llm_transcript')).to.not.include(kind);
      expect(getKindsForView('operator_timeline')).to.not.include(kind);
    }
  });

  it('keeps every kind the dashboard timeline renders, so scoping to a view is not a regression', () => {
    expect(getKindsForView('operator_timeline')).to.include.members([
      'message.subscriber',
      'message.agent',
      'message.platform_user',
      'message.system',
      'edit',
      'delete',
      'signal.other',
      'tool_approval_request',
      'tool_approval_decision',
      'mcp_connection_request',
      'mcp_connection_result',
      'workflow_origin',
    ]);
  });

  it('keeps workflow_origin on the operator timeline only', () => {
    expect(getKindsForView('operator_timeline')).to.include('workflow_origin');
    expect(getKindsForView('agent_handoff')).to.not.include('workflow_origin');
    expect(getKindsForView('llm_transcript')).to.not.include('workflow_origin');
    expect(getKindsForView('client_events')).to.not.include('workflow_origin');
    expect(getKindsForView('approval_activities')).to.not.include('workflow_origin');
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
