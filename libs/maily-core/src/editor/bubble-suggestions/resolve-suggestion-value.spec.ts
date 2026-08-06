import { describe, expect, it } from 'vitest';
import { resolveSuggestionInsertValue } from './resolve-suggestion-value';

const variableProvider = { name: 'variable', triggerPattern: '{{' };

describe('resolveSuggestionInsertValue', () => {
  it('stores a whole-field variable pick as a bare path for pill mode', () => {
    const result = resolveSuggestionInsertValue({
      currentValue: '{{payload.foo',
      triggerIndex: 0,
      formattedValue: 'payload.foo',
      provider: variableProvider,
    });

    expect(result).toEqual({
      value: 'payload.foo',
      isWholeFieldSuggestion: true,
    });
  });

  it('keeps free-text prefix and inserts liquid braces for mixed text + variable', () => {
    const result = resolveSuggestionInsertValue({
      currentValue: 'https://example.com/{{payload.foo',
      triggerIndex: 'https://example.com/'.length,
      formattedValue: 'payload.foo',
      provider: variableProvider,
    });

    expect(result).toEqual({
      value: 'https://example.com/{{payload.foo}}',
      isWholeFieldSuggestion: false,
    });
  });

  it('supports label-style text + variable combinations', () => {
    const result = resolveSuggestionInsertValue({
      currentValue: 'Open {{payload.name',
      triggerIndex: 'Open '.length,
      formattedValue: 'payload.name',
      provider: variableProvider,
    });

    expect(result).toEqual({
      value: 'Open {{payload.name}}',
      isWholeFieldSuggestion: false,
    });
  });

  it('does not double-wrap values that already include liquid braces', () => {
    const result = resolveSuggestionInsertValue({
      currentValue: 'https://example.com/{{',
      triggerIndex: 'https://example.com/'.length,
      formattedValue: '{{payload.foo}}',
      provider: variableProvider,
    });

    expect(result).toEqual({
      value: 'https://example.com/{{payload.foo}}',
      isWholeFieldSuggestion: false,
    });
  });

  it('preserves prefix for non-variable providers without wrapping', () => {
    const result = resolveSuggestionInsertValue({
      currentValue: 'Hello #welcome',
      triggerIndex: 'Hello '.length,
      formattedValue: '#welcome',
      provider: { name: 'inlineDecorator', triggerPattern: '#' },
    });

    expect(result).toEqual({
      value: 'Hello #welcome',
      isWholeFieldSuggestion: false,
    });
  });
});
