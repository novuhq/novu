import { CopilotViewingResourceEnum } from '@novu/shared';
import type { CopilotPageView } from '@/components/copilot-web-chat/copilot-page-view-store';

/** The question about the agent open on its page; it leads the Copilot's suggestions. */
export const AGENT_READINESS_QUESTION = 'Can this agent reply on all its channels?';

/** The question about the channel open on the agent's Channels tab. */
export const AGENT_CHANNEL_QUESTION = 'Is this channel ready to reply?';

/** The question about the conversation open in the conversation sheet. */
export const AGENT_CONVERSATION_QUESTION = 'Summarize this conversation';

export type AgentPageViewInput = {
  /** The agent the page loaded, kept after a failed refetch. */
  agent?: { identifier: string; name: string };
  /** The channel open on the Channels tab, by integration identifier, from the URL. */
  channelIdentifier?: string;
  /** The conversation open in the conversation sheet, by its `conv_…` identifier. */
  conversationIdentifier?: string;
  /** Whether a sheet or drawer covers the page. */
  sheetOpen: boolean;
};

/**
 * What the agent details page registers with the Copilot: the conversation open in its sheet, else the agent, with the
 * channel open on the Channels tab as a filter. A conversation has no label: its title is the first message an end user
 * wrote. No agent before one loaded, such as a mistyped identifier.
 */
export function buildAgentPageView({
  agent,
  channelIdentifier,
  conversationIdentifier,
  sheetOpen,
}: AgentPageViewInput): CopilotPageView {
  if (conversationIdentifier) {
    return {
      viewing: {
        resource: { type: CopilotViewingResourceEnum.CONVERSATION, id: conversationIdentifier },
        filters: agent ? { agent: agent.identifier } : undefined,
      },
      question: AGENT_CONVERSATION_QUESTION,
      overSheet: true,
    };
  }

  if (!agent) return { overSheet: sheetOpen };

  return {
    viewing: {
      resource: { type: CopilotViewingResourceEnum.AGENT, id: agent.identifier, label: agent.name },
      filters: channelIdentifier ? { channel: channelIdentifier } : undefined,
    },
    question: channelIdentifier ? AGENT_CHANNEL_QUESTION : AGENT_READINESS_QUESTION,
    overSheet: sheetOpen,
  };
}
