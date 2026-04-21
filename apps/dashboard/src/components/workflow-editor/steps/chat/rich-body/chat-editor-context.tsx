import { createContext, ReactNode, useContext, useMemo } from 'react';
import type { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';

export type ChatEditorContextValue = {
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
};

const defaultContext: ChatEditorContextValue = {
  variables: [],
  isAllowedVariable: () => false,
};

const ChatEditorContext = createContext<ChatEditorContextValue>(defaultContext);

export function ChatEditorProvider({
  value,
  children,
}: {
  value: ChatEditorContextValue;
  children: ReactNode;
}) {
  const memoValue = useMemo(() => value, [value]);

  return <ChatEditorContext.Provider value={memoValue}>{children}</ChatEditorContext.Provider>;
}

export function useChatEditorContext(): ChatEditorContextValue {
  return useContext(ChatEditorContext);
}
