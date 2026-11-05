import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getIdFromSlug, WORKFLOW_DIVIDER } from '@/utils/id-utils';
import { useCopilotWebChat } from './copilot-web-chat-context';

/** Navigation state the create-workflow modal hands to the editor so the Copilot builds the new workflow. */
export type CopilotPromptLocationState = { copilotPrompt: string };

type PendingPrompt = { text: string; workflowId: string };

/**
 * Puts the prompt from the navigation state in the revealed composer right away, so it stays visible if the Copilot
 * never connects, and sends it as the first message once connected unless it was edited or sent meanwhile.
 * Leaving the workflow it was created for before then drops it, so it never builds onto another workflow.
 */
export function useCopilotPendingPrompt() {
  const location = useLocation();
  const navigate = useNavigate();
  const { workflowSlug = '' } = useParams<{ workflowSlug?: string }>();
  const workflowId = getIdFromSlug({ slug: workflowSlug, divider: WORKFLOW_DIVIDER });
  const { chat, pageContext, draft, setDraft, open, sendMessage } = useCopilotWebChat();
  const locationPrompt = (location.state as Partial<CopilotPromptLocationState> | null)?.copilotPrompt;
  const [pendingPrompt, setPendingPrompt] = useState<PendingPrompt>();
  const isReady = !!chat && !chat.isLoading && !!pageContext?.workflowId;

  useEffect(() => {
    if (!locationPrompt) return;

    navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: null });
    setPendingPrompt({ text: locationPrompt, workflowId });
    open({ prefill: locationPrompt });
  }, [locationPrompt, workflowId, navigate, location.pathname, location.search, location.hash, open]);

  useEffect(() => {
    if (!pendingPrompt) return;

    if (pendingPrompt.workflowId !== workflowId) {
      setPendingPrompt(undefined);
      if (draft === pendingPrompt.text) setDraft('');

      return;
    }

    if (!isReady) return;

    setPendingPrompt(undefined);
    if (draft !== pendingPrompt.text) return;

    setDraft('');
    void sendMessage(pendingPrompt.text).then((isSent) => {
      if (!isSent) setDraft(pendingPrompt.text);
    });
  }, [pendingPrompt, workflowId, isReady, draft, setDraft, sendMessage]);
}
