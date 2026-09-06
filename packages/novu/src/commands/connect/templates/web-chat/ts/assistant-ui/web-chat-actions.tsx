'use client';

import type { UseWebChatResult } from '@novu/react';
import { createContext, useContext, type ReactNode } from 'react';

export type WebChatUiActions = {
  sendAction: UseWebChatResult['sendAction'];
  respondToAction: UseWebChatResult['respondToAction'];
  retryMessage: UseWebChatResult['retryMessage'];
  pagination: UseWebChatResult['pagination'];
  typingLabel?: string;
  pendingActionCount: number;
  composerBusy: boolean;
  /** Failures with no inline surface of their own. Rendered above the composer. */
  banner?: { title: string; detail: string; onRetry?: () => void };
};

const WebChatUiContext = createContext<WebChatUiActions | null>(null);

export function WebChatUiProvider({ value, children }: { value: WebChatUiActions; children: ReactNode }) {
  return <WebChatUiContext.Provider value={value}>{children}</WebChatUiContext.Provider>;
}

export function useWebChatUi(): WebChatUiActions {
  const value = useContext(WebChatUiContext);
  if (!value) {
    throw new Error('useWebChatUi must be used under WebChatUiProvider');
  }

  return value;
}
