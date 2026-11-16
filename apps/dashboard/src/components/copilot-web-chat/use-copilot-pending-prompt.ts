import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getIdFromSlug, WORKFLOW_DIVIDER } from '@/utils/id-utils';
import {
  getPendingPromptAction,
  type PendingCopilotPrompt,
  readStoredPendingPrompt,
  writeStoredPendingPrompt,
} from './copilot-pending-prompt';
import { useCopilotWebChat } from './copilot-web-chat-context';

/** Navigation state the create-workflow modal hands to the editor so the Copilot builds the new workflow. */
export type CopilotPromptLocationState = { copilotPrompt: string };

/**
 * Puts the prompt from the navigation state in the revealed composer right away, so it stays visible if the Copilot
 * never connects, and sends it as the first message once connected unless it was edited or sent meanwhile.
 * A copy in session storage brings it back after a reload; it is then sent only into an empty thread.
 * Leaving the workflow it was created for before then drops it, so it never builds onto another workflow.
 */
export function useCopilotPendingPrompt() {
  const location = useLocation();
  const navigate = useNavigate();
  const { workflowSlug = '' } = useParams<{ workflowSlug?: string }>();
  const workflowId = getIdFromSlug({ slug: workflowSlug, divider: WORKFLOW_DIVIDER });
  const { chat, pageContext, draft, setDraft, open, sendMessage } = useCopilotWebChat();
  const locationPrompt = (location.state as Partial<CopilotPromptLocationState> | null)?.copilotPrompt;
  const [pendingPrompt, setPendingPrompt] = useState<PendingCopilotPrompt>();
  const isReady = !!chat && !chat.isLoading && !!pageContext?.workflowId;
  // A failed history load shows no messages, so it does not count as empty.
  const isThreadEmpty = !!chat && chat.messages.length === 0 && !chat.error;

  // Runs before the router-state effect below, so a fresh prompt is not restored a second time from its own copy.
  useEffect(() => {
    const storedPrompt = readStoredPendingPrompt();
    if (!storedPrompt) return;

    if (storedPrompt.workflowId !== workflowId) {
      writeStoredPendingPrompt(undefined);

      return;
    }

    setPendingPrompt(storedPrompt);
    open({ prefill: storedPrompt.text });
  }, [workflowId, open]);

  useEffect(() => {
    if (!locationPrompt) return;

    const prompt = { text: locationPrompt, workflowId };
    void navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: null });
    writeStoredPendingPrompt(prompt);
    setPendingPrompt(prompt);
    open({ prefill: locationPrompt });
  }, [locationPrompt, workflowId, navigate, location.pathname, location.search, location.hash, open]);

  useEffect(() => {
    if (!pendingPrompt) return;

    const action = getPendingPromptAction({ prompt: pendingPrompt, workflowId, draft, isReady, isThreadEmpty });
    if (action === 'wait') return;

    setPendingPrompt(undefined);
    writeStoredPendingPrompt(undefined);

    if (action === 'drop') {
      if (draft === pendingPrompt.text) setDraft('');

      return;
    }

    if (action === 'keep') return;

    setDraft('');
    void sendMessage(pendingPrompt.text).then((isSent) => {
      if (!isSent) setDraft(pendingPrompt.text);
    });
  }, [pendingPrompt, workflowId, isReady, isThreadEmpty, draft, setDraft, sendMessage]);
}
