import { Editor } from '@tiptap/core';
import { SuggestionContext, SuggestionProvider, SuggestionProviderFactory } from './suggestion-provider';

/**
 * Whether `query` (text after a trigger) is still an open suggestion, vs completed content.
 * For the liquid trigger `{{`, a closing `}}` means the expression is finished — focusing a field
 * that already contains `{{ payload.foo }} bar {{ subscriber.firstName }}` must not open Variables.
 */
function isOpenSuggestionQuery(triggerPattern: string, query: string): boolean {
  if (triggerPattern === '{{') {
    return !query.includes('}}');
  }

  return true;
}

class SuggestionRegistry {
  private factories: Map<string, SuggestionProviderFactory> = new Map();

  register(name: string, factory: SuggestionProviderFactory) {
    this.factories.set(name, factory);
  }

  unregister(name: string) {
    this.factories.delete(name);
  }

  getProviders(editor: Editor, enabledProviders?: string[]): SuggestionProvider[] {
    const providers: SuggestionProvider[] = [];

    for (const [name, factory] of this.factories) {
      // If enabledProviders is specified, only include those
      if (enabledProviders && !enabledProviders.includes(name)) {
        continue;
      }

      try {
        const provider = factory(editor);
        if (provider) {
          providers.push(provider);
        }
      } catch (error) {
        console.warn(`Failed to create suggestion provider "${name}":`, error);
      }
    }

    return providers;
  }

  detectActiveProvider(value: string, providers: SuggestionProvider[]): SuggestionContext | null {
    // Sort providers by trigger pattern length (longest first) to handle overlapping patterns
    const sortedProviders = [...providers].sort((a, b) => {
      const aLength = typeof a.triggerPattern === 'string' ? a.triggerPattern.length : 0;
      const bLength = typeof b.triggerPattern === 'string' ? b.triggerPattern.length : 0;

      return bLength - aLength;
    });

    for (const provider of sortedProviders) {
      if (typeof provider.triggerPattern === 'string') {
        // Walk triggers from the end so an open `{{` after completed expressions still wins, while
        // completed `{{ ... }}` content (card button label/url) does not reopen the Variables list.
        let searchFrom = value.length;

        while (searchFrom > 0) {
          const triggerIndex = value.lastIndexOf(provider.triggerPattern, searchFrom - 1);

          if (triggerIndex === -1) {
            break;
          }

          const query = value.slice(triggerIndex + provider.triggerPattern.length);

          if (isOpenSuggestionQuery(provider.triggerPattern, query)) {
            return { query, provider, triggerIndex };
          }

          searchFrom = triggerIndex;
        }
      } else {
        // RegExp pattern
        const match = provider.triggerPattern.exec(value);

        if (match) {
          return {
            query: match[1] || '',
            provider,
            triggerIndex: match.index || 0,
          };
        }
      }
    }

    return null;
  }

  findMatchingProvider(value: string, providers: SuggestionProvider[]): SuggestionProvider | null {
    return providers.find((provider) => provider.isMatch(value)) || null;
  }
}

// Global registry instance
export const suggestionRegistry = new SuggestionRegistry();

// Convenience functions
export function registerSuggestionProvider(name: string, factory: SuggestionProviderFactory) {
  suggestionRegistry.register(name, factory);
}

export function getSuggestionProviders(editor: Editor, enabledProviders?: string[]): SuggestionProvider[] {
  return suggestionRegistry.getProviders(editor, enabledProviders);
}

export function detectActiveProvider(value: string, providers: SuggestionProvider[]): SuggestionContext | null {
  return suggestionRegistry.detectActiveProvider(value, providers);
}

export function findMatchingProvider(value: string, providers: SuggestionProvider[]): SuggestionProvider | null {
  return suggestionRegistry.findMatchingProvider(value, providers);
}
