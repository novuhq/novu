import type { CopilotFollowUp } from '@novu/shared';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { useCopilotWebChat } from './copilot-web-chat-context';
import { useOpenCopilotLink } from './use-open-copilot-link';

/** A chip under the answer, or Tab on the composer's ghost text, which fills the input instead of sending. */
export type CopilotFollowUpSource = 'chip' | 'tab';

/** Sends a follow-up to the Copilot, opens the dashboard page it names, or, from Tab, puts it in the composer. */
export function useCopilotFollowUp() {
  const { sendMessage, setDraft, surface, pageContext } = useCopilotWebChat();
  const openLink = useOpenCopilotLink();
  const track = useTelemetry();

  return (followUp: CopilotFollowUp, index: number, source: CopilotFollowUpSource) => {
    const opensPage = !!followUp.url && source === 'chip';
    track(TelemetryEvent.COPILOT_FOLLOW_UP_USED, {
      followUp: followUp.text,
      index,
      source,
      opens: opensPage ? 'page' : 'copilot',
      surface,
      page: pageContext?.page,
    });

    if (source === 'tab') {
      setDraft(followUp.text);

      return;
    }

    if (followUp.url && openLink(followUp.url)) return;

    void sendMessage(followUp.text);
  };
}
