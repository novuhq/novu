import { CopilotPageEnum } from '@novu/shared';
import { useEffect, useSyncExternalStore } from 'react';
import { buildAgentPageView } from '@/components/agents/agents-copilot';
import { useRegisterCopilotPageView } from '@/components/copilot-web-chat';

/*
 * The agent details page registers one Copilot page view, but its sheets open deep inside its tabs. Each sheet reports
 * here while it is open, and the page reads the result, so the Copilot rises above any of them and knows which
 * conversation is open.
 */

type AgentOverlays = { openSheets: number; conversationIdentifier?: string };

let overlays: AgentOverlays = { openSheets: 0 };
const listeners = new Set<() => void>();

function update(next: Partial<AgentOverlays>) {
  overlays = { ...overlays, ...next };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

/** Reports a sheet or drawer on the agent pages while it is open. */
export function useReportAgentSheetOpen(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;

    update({ openSheets: overlays.openSheets + 1 });

    return () => update({ openSheets: overlays.openSheets - 1 });
  }, [isOpen]);
}

/** Reports the conversation open in the agent's conversation sheet, by its `conv_…` identifier. */
export function useReportAgentConversation(conversationIdentifier: string | null) {
  useEffect(() => {
    if (!conversationIdentifier) return;

    update({ conversationIdentifier });

    return () => {
      if (overlays.conversationIdentifier === conversationIdentifier) update({ conversationIdentifier: undefined });
    };
  }, [conversationIdentifier]);
}

/** Whether a sheet covers the agent page, and the conversation open in one. */
export function useAgentOverlays(): AgentOverlays {
  return useSyncExternalStore(subscribe, () => overlays);
}

/**
 * Tells the Agents page Copilot what the agent details page has open: the agent, its channel or conversation, a sheet.
 * A component that renders nothing, so a sheet opening re-renders it and not the whole page.
 */
export function AgentCopilotView({
  agent,
  channelIdentifier,
  chatPreviewOpen,
}: {
  agent?: { identifier: string; name: string };
  channelIdentifier?: string;
  /** The web-chat preview drawer, which the page itself opens. */
  chatPreviewOpen: boolean;
}) {
  const { openSheets, conversationIdentifier } = useAgentOverlays();

  useRegisterCopilotPageView(
    CopilotPageEnum.AGENTS,
    buildAgentPageView({
      agent: agent && { identifier: agent.identifier, name: agent.name },
      channelIdentifier,
      conversationIdentifier,
      sheetOpen: openSheets > 0 || chatPreviewOpen,
    })
  );

  return null;
}
