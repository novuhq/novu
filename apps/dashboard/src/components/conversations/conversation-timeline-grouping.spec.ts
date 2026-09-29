import { describe, expect, it } from 'vitest';
import { ConversationActivityDto } from '@/api/conversations';
import { groupActivitiesForTimeline } from './conversation-timeline-grouping';

describe('groupActivitiesForTimeline', () => {
  const message = (overrides: Partial<ConversationActivityDto>): ConversationActivityDto => ({
    _id: 'msg',
    identifier: 'act_msg',
    _conversationId: 'conv',
    type: 'message',
    content: 'card',
    platform: 'slack',
    _integrationId: 'int',
    platformThreadId: 't',
    senderType: 'agent',
    senderId: 'agent-1',
    platformMessageId: 'msg-1',
    _environmentId: 'env',
    _organizationId: 'org',
    createdAt: '2026-09-21T12:00:00.000Z',
    ...overrides,
  });

  it('hides the delivered HITL card message when a request row shares its platform message id', () => {
    const request: ConversationActivityDto = {
      ...message({ _id: 'req', identifier: 'act_req', type: 'human_interaction_request', content: 'Waiting' }),
    };

    expect(groupActivitiesForTimeline([request, message({})]).map((activity) => activity._id)).toEqual(['req']);
  });

  it('keeps tool approval request and decision rows', () => {
    const request = message({
      _id: 'req',
      type: 'tool_approval_request',
      content: 'Approval required: issueRefund',
      platformMessageId: 'msg-2',
    });
    const decision = message({
      _id: 'dec',
      type: 'tool_approval_decision',
      senderType: 'subscriber',
      senderId: 'sub-1',
      content: 'Approved issueRefund',
      platformMessageId: undefined,
    });

    expect(groupActivitiesForTimeline([request, decision]).map((activity) => activity._id)).toEqual(['req', 'dec']);
  });
});
