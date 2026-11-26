import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { writeCopilotHandoff } from './copilot-handoff';
import { useCopilotWebChat } from './copilot-web-chat-context';

/** Opens a dashboard link from the Copilot in place, and has the Copilot on that page continue this chat. */
export function useCopilotLinkNavigate(): (href: string) => void {
  const navigate = useNavigate();
  const { chat } = useCopilotWebChat();
  const conversationId = chat?.conversationId;

  return useCallback(
    (href: string) => {
      const url = new URL(href, window.location.origin);
      if (conversationId) writeCopilotHandoff({ conversationId });
      void navigate(`${url.pathname}${url.search}${url.hash}`);
    },
    [navigate, conversationId]
  );
}
