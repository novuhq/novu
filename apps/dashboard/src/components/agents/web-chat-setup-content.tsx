export {
  WEB_CHAT_DOCS_URL,
  APPLICATION_IDENTIFIER_PLACEHOLDER,
  buildWebChatPrompt,
  buildWebChatTuiCommand,
  buildWebChatTuiCommandForDisplay,
  NOVU_CONNECT_WEB_CHAT_TUI_COMMAND,
  SUBSCRIBER_ID_PLACEHOLDER,
} from '@novu/shared';

import { PrebuiltPromptBanner } from '@/components/onboarding/connect-agent/prebuilt-prompt-banner';

export function WebChatEmbedResources({ prompt }: { prompt: string }) {
  return <PrebuiltPromptBanner prompt={prompt} source="web-channel-setup-web-chat" layout="actions" />;
}
