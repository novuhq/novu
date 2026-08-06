// Core types and interfaces

// Components
export { SuggestionInput } from './suggestion-input';
export type {
  SuggestionContext,
  SuggestionItem,
  SuggestionProvider,
  SuggestionProviderFactory,
} from './suggestion-provider';
export { resolveSuggestionInsertValue } from './resolve-suggestion-value';
export type { ResolveSuggestionValueParams, ResolvedSuggestionValue } from './resolve-suggestion-value';
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
