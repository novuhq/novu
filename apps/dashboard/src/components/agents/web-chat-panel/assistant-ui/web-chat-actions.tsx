import type { UseWebChatResult } from '@novu/react';
import { createContext, type ReactNode, useContext } from 'react';
import type { WebChatSessionItem } from '../use-web-chat-conversation-list';

export type WebChatUiActions = {
  sendAction: UseWebChatResult['sendAction'];
  respondToAction: UseWebChatResult['respondToAction'];
  retryMessage: UseWebChatResult['retryMessage'];
  pagination: UseWebChatResult['pagination'];
  typingLabel?: string;
  pendingActionCount: number;
  composerBusy: boolean;
  agentName: string;
  showAddToAppCallouts: boolean;
  addToAppHref?: string;
  conversations: WebChatSessionItem[];
  conversationListFailed: boolean;
  onSelectConversation: (identifier: string) => void;
  onShowConversationList: () => void;
  banner?: { title: string; detail: string; onRetry?: () => void };
};

const WebChatUiContext = createContext<WebChatUiActions | null>(null);

export function WebChatUiProvider({ value, children }: { value: WebChatUiActions; children: ReactNode }) {
  return <WebChatUiContext.Provider value={value}>{children}</WebChatUiContext.Provider>;
}

// biome-ignore lint/style/useComponentExportOnlyModules: Hook is co-located with provider
export function useWebChatUi(): WebChatUiActions {
  const value = useContext(WebChatUiContext);
  if (!value) {
    throw new Error('useWebChatUi must be used under WebChatUiProvider');
  }

  return value;
}
