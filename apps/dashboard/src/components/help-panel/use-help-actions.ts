import { usePlainChat } from '@/hooks/use-plain-chat';
import { useTelemetry } from '@/hooks/use-telemetry';
import { openMintlifyAssistant } from '@/utils/mintlify-assistant';
import { TelemetryEvent } from '@/utils/telemetry';
import { openInNewTab } from '@/utils/url';
import { BOOK_DEMO_URL, CHANGELOG_URL, docsUrl } from './help-links';

const TELEMETRY_SOURCE = 'help-panel';

type AskAiTrigger = 'query' | 'suggestion';

type HelpActionsOptions = {
  assistantContext: string | null;
  onClose: () => void;
};

export type HelpActions = ReturnType<typeof useHelpActions>;

export function useHelpActions({ assistantContext, onClose }: HelpActionsOptions) {
  const telemetry = useTelemetry();
  const { showPlainLiveChat, isLiveChatVisible } = usePlainChat();

  function openExternal(url: string) {
    openInNewTab(url);
    onClose();
  }

  function openLiveChat() {
    if (!isLiveChatVisible) {
      openExternal(docsUrl());

      return;
    }

    showPlainLiveChat();
    onClose();
  }

  return {
    askAi(question: string, trigger: AskAiTrigger) {
      telemetry(TelemetryEvent.SUPPORT_DRAWER_ASK_AI_CLICKED, {
        source: TELEMETRY_SOURCE,
        trigger,
        hasPageContext: assistantContext !== null,
      });
      onClose();
      void openMintlifyAssistant({
        source: TELEMETRY_SOURCE,
        query: assistantContext ? `${question}\n\nContext: ${assistantContext}` : question,
      });
    },
    openDocsLink(title: string, url: string, isSearchResult: boolean) {
      telemetry(TelemetryEvent.SUPPORT_DRAWER_SUGGESTION_CLICKED, { suggestionTitle: title, isSearchResult });
      openExternal(url);
    },
    chatWithUs() {
      telemetry(TelemetryEvent.SUPPORT_DRAWER_CHAT_CLICKED);
      openLiveChat();
    },
    bookDemo() {
      telemetry(TelemetryEvent.SUPPORT_DRAWER_BOOK_DEMO_CLICKED);
      openExternal(BOOK_DEMO_URL);
    },
    openChangelog() {
      telemetry(TelemetryEvent.SUPPORT_DRAWER_CHANGELOG_CLICKED);
      openExternal(CHANGELOG_URL);
    },
    shareFeedback() {
      telemetry(TelemetryEvent.SHARE_FEEDBACK_LINK_CLICKED, { source: TELEMETRY_SOURCE });
      openLiveChat();
    },
    openDocs() {
      telemetry(TelemetryEvent.SUPPORT_DRAWER_DOCUMENTATION_CLICKED);
      openExternal(docsUrl());
    },
  };
}
