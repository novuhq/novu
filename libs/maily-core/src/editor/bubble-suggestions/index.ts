// Core types and interfaces

// Components
export { SuggestionInput } from './suggestion-input';
export type {
  SuggestionContext,
  SuggestionItem,
  SuggestionProvider,
  SuggestionProviderFactory,
} from './suggestion-provider';
// Registry functions
export {
  detectActiveProvider,
  findMatchingProvider,
  getSuggestionProviders,
  registerSuggestionProvider,
} from './suggestion-registry';
// React hooks
export {
  useActiveSuggestion,
  useMatchingProvider,
  useSuggestionProviders,
} from './use-suggestion-providers';
