import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCopilotWebChat } from './copilot-web-chat-context';

/** Navigation state the create-workflow modal hands to the editor so the Copilot builds the new workflow. */
export type CopilotPromptLocationState = { copilotPrompt: string };

/**
 * Puts the prompt from the navigation state in the open popover's composer right away, so it stays visible if the
 * Copilot never connects, and sends it as the first message once connected unless it was edited or sent meanwhile.
 */
export function useCopilotPendingPrompt() {
  const location = useLocation();
  const navigate = useNavigate();
  const { chat, pageContext, draft, setDraft, open, sendMessage } = useCopilotWebChat();
  const locationPrompt = (location.state as Partial<CopilotPromptLocationState> | null)?.copilotPrompt;
  const [pendingPrompt, setPendingPrompt] = useState<string>();
  const isReady = !!chat && !chat.isLoading && !!pageContext?.workflowId;

  useEffect(() => {
    if (!locationPrompt) return;

    navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: null });
    setPendingPrompt(locationPrompt);
    open({ prefill: locationPrompt });
  }, [locationPrompt, navigate, location.pathname, location.search, location.hash, open]);

  useEffect(() => {
    if (!pendingPrompt || !isReady) return;

    setPendingPrompt(undefined);
    if (draft !== pendingPrompt) return;

    setDraft('');
    void sendMessage(pendingPrompt).then((isSent) => {
      if (!isSent) setDraft(pendingPrompt);
    });
  }, [pendingPrompt, isReady, draft, setDraft, sendMessage]);
}
