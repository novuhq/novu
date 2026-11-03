import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCopilotWebChat } from './copilot-web-chat-context';

/** Navigation state the create-workflow modal hands to the editor so the Copilot builds the new workflow. */
export type CopilotPromptLocationState = { copilotPrompt: string };

/**
 * Sends the prompt from the navigation state as the first Copilot message once the popover is connected to the
 * workflow, then drops it from the history entry so a reload does not send it again.
 */
export function useCopilotPendingPrompt() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAvailable, chat, pageContext, open, sendMessage } = useCopilotWebChat();
  const prompt = (location.state as Partial<CopilotPromptLocationState> | null)?.copilotPrompt;
  const isSentRef = useRef(false);
  const isReady = isAvailable && !!chat && !chat.isLoading && !!pageContext?.workflowId;

  useEffect(() => {
    if (!prompt || !isReady || isSentRef.current) return;

    isSentRef.current = true;
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    open();
    void sendMessage(prompt).then((isSent) => {
      if (!isSent) open({ prefill: prompt });
    });
  }, [prompt, isReady, navigate, location.pathname, location.search, open, sendMessage]);
}
