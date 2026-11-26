import { CopilotViewingResourceEnum, serializeCopilotViewing } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import {
  AGENT_CHANNEL_QUESTION,
  AGENT_CONVERSATION_QUESTION,
  AGENT_READINESS_QUESTION,
  buildAgentPageView,
} from './agents-copilot';

const agent = { identifier: 'support-bot', name: 'Support bot' };

describe('buildAgentPageView', () => {
  it('names the open agent and asks whether it can reply', () => {
    expect(buildAgentPageView({ agent, sheetOpen: false })).toEqual({
      viewing: { resource: { type: CopilotViewingResourceEnum.AGENT, id: 'support-bot', label: 'Support bot' } },
      question: AGENT_READINESS_QUESTION,
      overSheet: false,
    });
  });

  it('adds the channel open on the Channels tab as a filter', () => {
    const view = buildAgentPageView({ agent, channelIdentifier: 'slack-1', sheetOpen: false });

    expect(view.viewing?.filters).toEqual({ channel: 'slack-1' });
    expect(view.question).toBe(AGENT_CHANNEL_QUESTION);
  });

  it('names the open conversation without a label, above its sheet', () => {
    expect(buildAgentPageView({ agent, conversationIdentifier: 'conv_1a2b', sheetOpen: false })).toEqual({
      viewing: {
        resource: { type: CopilotViewingResourceEnum.CONVERSATION, id: 'conv_1a2b' },
        filters: { agent: 'support-bot' },
      },
      question: AGENT_CONVERSATION_QUESTION,
      overSheet: true,
    });
  });

  it('rises above a sheet while one is open', () => {
    expect(buildAgentPageView({ agent, sheetOpen: true }).overSheet).toBe(true);
  });

  it('names no agent before one loaded', () => {
    expect(buildAgentPageView({ sheetOpen: false })).toEqual({ overSheet: false });
  });

  it('fits what it sends in the web-chat metadata', () => {
    const view = buildAgentPageView({ agent, channelIdentifier: 'slack-1', sheetOpen: false });

    expect(JSON.parse(serializeCopilotViewing(view.viewing) ?? '{}')).toEqual(view.viewing);
  });
});
