import { describe, expect, it } from 'vitest';
import { ConversationActivityDto } from '@/api/conversations';
import { getHitlOverviewState, getHitlTimelineLabel, isHitlTimelineActivity } from './conversation-hitl';

describe('conversation-hitl', () => {
  const base: ConversationActivityDto = {
    _id: '1',
    identifier: 'act_1',
    _conversationId: 'conv',
    type: 'message',
    content: '',
    platform: 'slack',
    _integrationId: 'int',
    platformThreadId: 't',
    senderType: 'agent',
    senderId: 'agent-1',
    _environmentId: 'env',
    _organizationId: 'org',
    createdAt: '2026-09-21T12:00:00.000Z',
  };

  it('labels a tool approval decision with the actor', () => {
    expect(
      getHitlTimelineLabel({
        ...base,
        type: 'tool_approval_decision',
        senderType: 'subscriber',
        senderId: 'sub-1',
        senderName: 'Ada',
        toolData: { approvalId: 'apr_1', approved: true, toolName: 'issueRefund' },
      })
    ).toBe('Approved issueRefund · Ada');
  });

  it('labels an answered HITL response with freeform text', () => {
    expect(
      getHitlTimelineLabel({
        ...base,
        type: 'human_interaction_response',
        senderType: 'subscriber',
        senderId: 'sub-1',
        senderName: 'Ada',
        richContent: {
          humanInteraction: { kind: 'ask', title: 'Which env?', status: 'answered', text: 'staging' },
        },
      })
    ).toBe('Answered by Ada: staging');
  });

  it('summarizes a pending tool approval in the info section', () => {
    const pending = {
      ...base,
      type: 'tool_approval_request' as const,
      toolData: { approvalId: 'apr_1', toolName: 'issueRefund' },
    };

    expect(getHitlOverviewState([pending])).toEqual({
      title: 'Tool approval required: issueRefund',
      detail: 'Waiting for a human response',
      isPending: true,
    });
  });

  it('treats tool and HITL rows as hitl timeline activities', () => {
    expect(isHitlTimelineActivity({ ...base, type: 'tool_approval_request' })).toBe(true);
    expect(isHitlTimelineActivity({ ...base, type: 'human_interaction_request' })).toBe(true);
    expect(isHitlTimelineActivity({ ...base, type: 'message' })).toBe(false);
  });
});
