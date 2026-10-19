'use client';

import { createContext, PropsWithChildren, useContext } from 'react';
import { BlockGroupItem } from '@/blocks/types';
import { DEFAULT_SLASH_COMMANDS } from './extensions/slash-command/default-slash-commands';

export const DEFAULT_PLACEHOLDER_URL = 'https://maily.to/';

/** Field name of a card (link) button validated by {@link MailyContextType.validateCardButtonField}. */
export type CardButtonFieldName = 'label' | 'url';

/**
 * Validates a single card-button field value. Returns an error message when invalid, or `null`
 * when valid. Injected by the host app so the Actions bubble and the app share one validation
 * source of truth; when absent no inline validation runs.
 */
export type ValidateCardButtonField = (field: CardButtonFieldName, value: string, isVariable: boolean) => string | null;

export type MailyContextType = {
  placeholderUrl?: string;
  blocks?: BlockGroupItem[];
  validateCardButtonField?: ValidateCardButtonField;
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
