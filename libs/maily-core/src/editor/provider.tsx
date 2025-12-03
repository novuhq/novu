'use client';

import { createContext, PropsWithChildren, useContext } from 'react';
import { BlockGroupItem } from '@/blocks/types';
import { DEFAULT_SLASH_COMMANDS } from './extensions/slash-command/default-slash-commands';

export const DEFAULT_PLACEHOLDER_URL = 'https://maily.to/';

export type MailyContextType = {
  placeholderUrl?: string;
  blocks?: BlockGroupItem[];
};

export const MailyContext = createContext<MailyContextType>({
  placeholderUrl: DEFAULT_PLACEHOLDER_URL,
  blocks: DEFAULT_SLASH_COMMANDS,
});

type MailyProviderProps = PropsWithChildren<MailyContextType>;

export function MailyProvider(props: MailyProviderProps) {
  const { children, ...defaultValues } = props;

  return <MailyContext.Provider value={defaultValues}>{children}</MailyContext.Provider>;
}

export function useMailyContext() {
  const values = useContext(MailyContext);
  if (!values) {
    throw new Error('Missing MailyContext.Provider in the component tree');
  }

  return values;
}
