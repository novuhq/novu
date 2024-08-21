import { createContextAndHook } from '../utils';

export type InputAutocompleteContextValue = { variablesSet: Set<string> };

const [InputAutocompleteContext, _useInputAutocompleteContext] =
  createContextAndHook<InputAutocompleteContextValue>('InputAutocompleteContext');

export const InputAutocompleteContextProvider = InputAutocompleteContext.Provider;
export const useInputAutocompleteContext = _useInputAutocompleteContext;
