import { expect } from 'chai';
import {
  ACTIVITY_KINDS,
  ACTIVITY_VIEW_MEMBERSHIP,
  compileActivityViewMatch,
  getKindsForView,
  isRecordOnlyToolResult,
} from './activity-views';
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
      'human_interaction_request',
      'human_interaction_response',
      'custom',
    ]);
  });

  it('shows custom app data to clients and operators, not the model transcript or handoff', () => {
    expect(getKindsForView('client_events')).to.include('custom');
    expect(getKindsForView('operator_timeline')).to.include('custom');
    expect(getKindsForView('llm_transcript')).to.not.include('custom');
    expect(getKindsForView('agent_handoff')).to.not.include('custom');
    expect(getKindsForView('approval_activities')).to.not.include('custom');
    expect(compileActivityViewMatch('client_events').$or).to.deep.include({
      type: ConversationActivityTypeEnum.CUSTOM,
    });
    expect(compileActivityViewMatch('operator_timeline').$or).to.deep.include({
      type: ConversationActivityTypeEnum.CUSTOM,
    });
    expect(compileActivityViewMatch('llm_transcript').$or).to.not.deep.include({
      type: ConversationActivityTypeEnum.CUSTOM,
    });
  });

  it('keeps human messages in approval_activities so the approval requester can be resolved', () => {
    expect(getKindsForView('approval_activities')).to.include.members(['message.subscriber', 'message.platform_user']);
  });

  it('keeps edit and delete off agent_handoff so the page is current-state rows', () => {
    expect(getKindsForView('agent_handoff')).to.not.include.members(['edit', 'delete']);
    expect(getKindsForView('operator_timeline')).to.include.members(['edit', 'delete']);
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
      {
        type: ConversationActivityTypeEnum.MESSAGE,
        senderType: ConversationActivitySenderTypeEnum.PLATFORM_USER,
      },
    ]);
  });

  it('shows tool calls to operators only until clients and model history can pair them with results', () => {
    expect(ACTIVITY_VIEW_MEMBERSHIP.tool_call).to.deep.equal(['operator_timeline']);
    expect(compileActivityViewMatch('operator_timeline').$or).to.deep.include({
      type: ConversationActivityTypeEnum.TOOL_CALL,
    });
  });

  it('keeps record-only tool results off the capped handoff, client, and approval pages', () => {
    const recordOnly = {
      type: ConversationActivityTypeEnum.TOOL_RESULT,
      'toolData.content': { $exists: true },
      'toolData.output': { $exists: false },
    };
    const modelFacing = {
      type: ConversationActivityTypeEnum.TOOL_RESULT,
      $nor: [{ 'toolData.content': { $exists: true }, 'toolData.output': { $exists: false } }],
    };

    expect(ACTIVITY_VIEW_MEMBERSHIP['tool_result.record']).to.deep.equal(['operator_timeline']);
    expect(compileActivityViewMatch('operator_timeline').$or).to.deep.include(recordOnly);

    for (const view of ['agent_handoff', 'client_events', 'approval_activities'] as const) {
      expect(compileActivityViewMatch(view).$or).to.deep.include(modelFacing);
      expect(compileActivityViewMatch(view).$or).to.not.deep.include(recordOnly);
    }
  });

  it('classifies a tool result as record-only when it has content but no output', () => {
    expect(isRecordOnlyToolResult({ toolCallId: 't', content: [], isError: false })).to.equal(true);
    expect(isRecordOnlyToolResult({ toolCallId: 't', output: 'x', content: [], isError: false })).to.equal(false);
    expect(isRecordOnlyToolResult({ toolCallId: 't', output: 'x' })).to.equal(false);
    expect(isRecordOnlyToolResult(undefined)).to.equal(false);
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
